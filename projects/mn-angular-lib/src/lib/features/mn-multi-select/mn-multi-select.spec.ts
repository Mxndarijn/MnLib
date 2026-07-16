import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Subject} from 'rxjs';

import {MnMultiSelect, MnMultiSelectProps} from 'mn-angular-lib';
import {MnConfigService} from '../../config';
import {MnLanguageService} from '../../language';

/**
 * Regression coverage for the dropdown positioning fix.
 *
 * The panel uses `position: fixed`; when any ancestor has a `transform`/`filter`/
 * `will-change`, that ancestor becomes the containing block for fixed elements,
 * which used to drop the panel in the middle of the screen (and break on iOS).
 * The fix portals the panel to `document.body` while open so its coordinates
 * resolve against the viewport again. These specs assert the portal behaviour
 * plus the preserved open/close semantics.
 */

/** Minimal config stub — the component only calls `resolve()`, which returns an empty config here. */
const configStub: Partial<MnConfigService> = {
  resolve: () => ({}) as never,
};

/** Language stub with a never-emitting locale stream and identity translation. */
const languageStub: Partial<MnLanguageService> = {
  locale$: new Subject<string>().asObservable(),
  translate: (key: string) => key,
  t: (key: string) => key,
};

/** Host that places the multi-select inside a `transform`ed ancestor — the exact bug trigger. */
@Component({
  standalone: true,
  imports: [MnMultiSelect],
  template: `
    <div class="transformed-ancestor" style="transform: translateY(20px); position: relative;">
      <mn-lib-multi-select [props]="props"></mn-lib-multi-select>
    </div>
  `,
})
class HostComponent {
  /** Props for the multi-select under test. */
  props: MnMultiSelectProps = {
    id: 'test-ms',
    options: [
      {label: 'Alpha', value: 'a'},
      {label: 'Beta', value: 'b'},
      {label: 'Gamma', value: 'c'},
    ],
    searchable: true,
  };
}

describe('MnMultiSelect (dropdown portal positioning)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let component: MnMultiSelect;

  /** The portalled panel element, wherever it currently lives in the DOM. */
  function panel(): HTMLElement | null {
    return document.getElementById('test-ms-listbox');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {provide: MnLanguageService, useValue: languageStub},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    component = fixture.debugElement.query(By.directive(MnMultiSelect)).componentInstance;
  });

  afterEach(() => {
    // Defensive: strip any leaked panel so tests stay isolated.
    panel()?.remove();
  });

  it('renders no panel while closed', () => {
    expect(panel()).toBeNull();
  });

  it('portals the panel to document.body (not the transformed ancestor) when opened', () => {
    component.toggle();
    fixture.detectChanges();

    const el = panel();
    expect(el).withContext('panel should be rendered when open').not.toBeNull();
    // The whole point of the fix: the panel escapes the transformed wrapper.
    expect(el!.parentElement).toBe(document.body);
    expect(el!.closest('.transformed-ancestor'))
      .withContext('panel must not be nested inside the transformed ancestor')
      .toBeNull();
  });

  it('positions the panel from the trigger rect with a fixed layout', () => {
    component.toggle();
    fixture.detectChanges();

    const el = panel()!;
    // Uses the `fixed` utility so the (now body-anchored) panel tracks the viewport.
    // Asserted via the class list because the Tailwind stylesheet is not loaded in
    // this isolated library test harness (computed `position` would read `static`).
    expect(el.classList.contains('fixed')).toBeTrue();
    // Top/left/width are derived from the trigger rect and applied as inline styles.
    expect(el.style.width).toMatch(/px$/);
    expect(el.style.top).toMatch(/px$/);
    expect(el.style.left).toMatch(/px$/);
  });

  it('removes the portalled panel from the DOM when closed', () => {
    component.toggle();
    fixture.detectChanges();
    expect(panel()).not.toBeNull();

    component.toggle();
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('removes the portalled panel when the component is destroyed while open', () => {
    component.toggle();
    fixture.detectChanges();
    expect(panel()).not.toBeNull();

    fixture.destroy();
    expect(panel()).toBeNull();
  });

  it('keeps the dropdown open when clicking inside the portalled panel', () => {
    component.toggle();
    fixture.detectChanges();

    const el = panel()!;
    el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    fixture.detectChanges();

    expect(component.isOpen).toBeTrue();
    expect(panel()).not.toBeNull();
  });

  it('closes the dropdown on an outside document click', () => {
    component.toggle();
    fixture.detectChanges();
    expect(component.isOpen).toBeTrue();

    document.body.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    fixture.detectChanges();

    expect(component.isOpen).toBeFalse();
    expect(panel()).toBeNull();
  });

  it('closes the dropdown on Escape', () => {
    component.toggle();
    fixture.detectChanges();
    expect(component.isOpen).toBeTrue();

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    fixture.detectChanges();

    expect(component.isOpen).toBeFalse();
    expect(panel()).toBeNull();
  });

  it('closes the dropdown on window scroll', () => {
    component.toggle();
    fixture.detectChanges();
    expect(component.isOpen).toBeTrue();

    component.onWindowScrollOrResize();
    fixture.detectChanges();

    expect(component.isOpen).toBeFalse();
    expect(panel()).toBeNull();
  });
});

/**
 * Coverage for the opt-in "collapse selected to a count summary" feature: once the
 * number of selected options passes a threshold, the trigger renders a single
 * summary (e.g. "18 selected") instead of every chip.
 */
@Component({
  standalone: true,
  imports: [MnMultiSelect],
  template: `
    <mn-lib-multi-select [props]="props"></mn-lib-multi-select> `,
})
class CollapseHostComponent {
  /** Six selectable options so tests can cross the default threshold of 5. */
  props: MnMultiSelectProps = {
    id: 'collapse-ms',
    options: [
      {label: 'One', value: 1},
      {label: 'Two', value: 2},
      {label: 'Three', value: 3},
      {label: 'Four', value: 4},
      {label: 'Five', value: 5},
      {label: 'Six', value: 6},
    ],
  };
}

describe('MnMultiSelect (collapse to count summary)', () => {
  let fixture: ComponentFixture<CollapseHostComponent>;
  let host: CollapseHostComponent;
  let component: MnMultiSelect;

  /**
   * The chip/summary elements rendered directly in the trigger's selected-values row.
   * Selects only the row's direct `<span>` children so nested chip buttons (which also
   * carry `inline-flex`) are not double-counted.
   */
  function chips(): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('#collapse-ms > div > span'),
    ) as HTMLElement[];
  }

  /** The visible text of the trigger's selected-values row. */
  function triggerText(): string {
    return (fixture.nativeElement.querySelector('#collapse-ms') as HTMLElement).textContent!.trim();
  }

  /** Rebuilds the fixture so per-test prop tweaks are picked up before first render. */
  function build(props: Partial<MnMultiSelectProps>): void {
    fixture = TestBed.createComponent(CollapseHostComponent);
    host = fixture.componentInstance;
    host.props = {...host.props, ...props};
    fixture.detectChanges();
    component = fixture.debugElement.query(By.directive(MnMultiSelect)).componentInstance;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollapseHostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {provide: MnLanguageService, useValue: languageStub},
      ],
    }).compileComponents();
  });

  it('renders individual chips (feature off) by default when no collapse props are set', () => {
    build({});
    component.writeValue([1, 2, 3, 4, 5, 6]);
    fixture.detectChanges();

    expect(component.collapseEnabled).toBeFalse();
    expect(component.isCollapsed).toBeFalse();
    expect(chips().length).toBe(6);
  });

  it('renders individual chips at the threshold (count not greater than threshold)', () => {
    build({collapsePlaceholder: '{count} selected'});
    // Exactly 5 selected == default threshold; collapse only triggers when strictly greater.
    component.writeValue([1, 2, 3, 4, 5]);
    fixture.detectChanges();

    expect(component.isCollapsed).toBeFalse();
    expect(chips().length).toBe(5);
  });

  it('collapses to the summary with the custom placeholder above the threshold', () => {
    build({collapsePlaceholder: '{count} selected'});
    component.writeValue([1, 2, 3, 4, 5, 6]);
    fixture.detectChanges();

    expect(component.isCollapsed).toBeTrue();
    expect(chips().length).toBe(1);
    expect(component.collapseSummaryText).toBe('6 selected');
    expect(triggerText()).toContain('6 selected');
  });

  it('substitutes every {count} token in the placeholder', () => {
    build({collapsePlaceholder: '{count} of many ({count})'});
    component.writeValue([1, 2, 3, 4, 5, 6]);
    fixture.detectChanges();

    expect(component.collapseSummaryText).toBe('6 of many (6)');
  });

  it('falls back to "{count} selected" when collapse is enabled via threshold only', () => {
    build({collapseThreshold: 2});
    component.writeValue([1, 2, 3]);
    fixture.detectChanges();

    expect(component.collapseEnabled).toBeTrue();
    expect(component.isCollapsed).toBeTrue();
    expect(component.collapseSummaryText).toBe('3 selected');
  });

  it('honours an explicit collapseThreshold instead of the default', () => {
    build({collapseThreshold: 3, collapsePlaceholder: '{count} chosen'});
    component.writeValue([1, 2, 3]);
    fixture.detectChanges();
    expect(component.isCollapsed).toBeFalse();

    component.writeValue([1, 2, 3, 4]);
    fixture.detectChanges();
    expect(component.isCollapsed).toBeTrue();
    expect(component.collapseSummaryText).toBe('4 chosen');
  });
});
