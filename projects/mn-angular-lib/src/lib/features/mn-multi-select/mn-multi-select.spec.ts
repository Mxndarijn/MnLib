import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Subject} from 'rxjs';

import {MnMultiSelect, MnMultiSelectOption, MnMultiSelectProps} from 'mn-angular-lib';
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
  /**
   * Props for the multi-select under test. `mobileSheet: false` pins the anchored
   * layout: this suite asserts trigger-relative positioning and scroll-to-close, both
   * of which the sheet deliberately does not do — without the pin the assertions would
   * hinge on how wide the Karma iframe happens to be.
   */
  props: MnMultiSelectProps = {
    id: 'test-ms',
    options: [
      {label: 'Alpha', value: 'a'},
      {label: 'Beta', value: 'b'},
      {label: 'Gamma', value: 'c'},
    ],
    searchable: true,
    mobileSheet: false,
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

  it('closes the dropdown when an inner scroll container scrolls', () => {
    component.toggle();
    fixture.detectChanges();
    expect(component.isOpen).toBeTrue();

    // `window:scroll` never fires for a nested scroller (a modal body, a scrollable
    // card), which used to leave the portalled panel floating at stale coordinates.
    const scroller = fixture.nativeElement.querySelector('.transformed-ancestor') as HTMLElement;
    scroller.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isOpen).toBeFalse();
    expect(panel()).toBeNull();
  });

  it('keeps the dropdown open when the panel\'s own option list is scrolled', () => {
    component.toggle();
    fixture.detectChanges();

    panel()!.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isOpen).toBeTrue();
    expect(panel()).not.toBeNull();
  });

  it('closes the dropdown when the trigger is hidden instead of destroyed', async () => {
    component.toggle();
    fixture.detectChanges();
    expect(panel()).not.toBeNull();

    // Guard against a vacuous pass: a visible trigger must survive the observer's
    // first (initial-state) delivery, otherwise the assertion below proves nothing.
    await waitForIntersectionObserver();
    expect(component.isOpen).withContext('visible trigger must stay open').toBeTrue();

    // Exactly what a wizard step switch does: the step wrapper is display:none'd, so the
    // multi-select is never destroyed and the body-portalled panel would otherwise stay
    // on screen with no visible trigger behind it.
    const wrapper = fixture.nativeElement.querySelector('.transformed-ancestor') as HTMLElement;
    wrapper.style.display = 'none';

    await waitForIntersectionObserver();
    fixture.detectChanges();

    expect(component.isOpen).withContext('hidden trigger must close its panel').toBeFalse();
    expect(panel()).toBeNull();
  });
});

/**
 * IntersectionObserver callbacks are delivered asynchronously, after layout. Two
 * animation frames plus a macrotask is comfortably past the first delivery.
 */
async function waitForIntersectionObserver(): Promise<void> {
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  await new Promise<void>(resolve => setTimeout(resolve, 50));
}

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

  it('says everything is selected as soon as it is, whatever the threshold', () => {
    // The whole point of the prop: a short option list never reaches a threshold, so without
    // this a fully-selected three-option field could only ever render three chips to count.
    build({allSelectedPlaceholder: 'All selected', collapseThreshold: 99});
    component.writeValue([1, 2, 3, 4, 5, 6]);
    fixture.detectChanges();

    expect(component.allSelected).toBeTrue();
    expect(component.isCollapsed).toBeTrue();
    expect(component.collapseSummaryText).toBe('All selected');
    expect(triggerText()).toContain('All selected');
  });

  it('enables collapsing on its own, with no other collapse prop set', () => {
    build({allSelectedPlaceholder: 'All selected'});

    expect(component.collapseEnabled).toBeTrue();
  });

  it('goes back to chips the moment one option is deselected', () => {
    build({allSelectedPlaceholder: 'All selected'});
    component.writeValue([1, 2, 3, 4, 5, 6]);
    fixture.detectChanges();
    expect(component.isCollapsed).toBeTrue();

    component.writeValue([1, 2, 3, 4, 5]);
    fixture.detectChanges();

    // Five of six is under the default threshold, so the summary must not linger.
    expect(component.allSelected).toBeFalse();
    expect(component.isCollapsed).toBeFalse();
  });

  it('prefers the all-selected summary over the count one', () => {
    build({allSelectedPlaceholder: 'All selected', collapsePlaceholder: '{count} selected'});
    component.writeValue([1, 2, 3, 4, 5, 6]);
    fixture.detectChanges();
    expect(component.collapseSummaryText).toBe('All selected');

    // ...and hands back to the count summary below the full set.
    component.writeValue([1, 2, 3, 4, 5, 6].slice(0, 6));
    component.writeValue([1, 2, 3, 4, 5]);
    fixture.detectChanges();
    expect(component.collapseSummaryText).toBe('5 selected');
  });

  it('substitutes {count} in the all-selected summary too', () => {
    build({allSelectedPlaceholder: 'All {count} selected'});
    component.writeValue([1, 2, 3, 4, 5, 6]);
    fixture.detectChanges();

    expect(component.collapseSummaryText).toBe('All 6 selected');
  });

  it('never claims everything is selected when there is nothing to select', () => {
    // "All of them" is a claim about nothing on an empty select, and an empty selection of
    // zero options would otherwise satisfy a naive length comparison.
    build({allSelectedPlaceholder: 'All selected', options: []});
    component.writeValue([]);
    fixture.detectChanges();

    expect(component.allSelected).toBeFalse();
    expect(component.isCollapsed).toBeFalse();
  });
});

/**
 * Coverage for the mobile bottom sheet and the auto-enabling search input.
 *
 * The sheet exists because the anchored panel sits at the trigger's bottom edge, which
 * on a phone is exactly where the soft keyboard appears once the search field is
 * focused. Viewport width is stubbed rather than measured so neither suite depends on
 * the size of the Karma iframe.
 */
@Component({
  standalone: true,
  imports: [MnMultiSelect],
  template: `
    <mn-lib-multi-select [props]="props"></mn-lib-multi-select> `,
})
class SheetHostComponent {
  /** Props for the multi-select under test; each spec overrides before first render. */
  props: MnMultiSelectProps = {
    id: 'sheet-ms',
    label: 'Members',
    options: [],
  };
}

describe('MnMultiSelect (mobile sheet and search threshold)', () => {
  let fixture: ComponentFixture<SheetHostComponent>;
  let component: MnMultiSelect;

  /** Builds `count` distinct options, enough to cross whichever threshold is under test. */
  function optionsOfLength(count: number): MnMultiSelectOption[] {
    return Array.from({length: count}, (_, i) => ({label: `Option ${i + 1}`, value: i + 1}));
  }

  /**
   * Forces the breakpoint the component reads at init. Stubbing `matchMedia` (rather
   * than resizing) keeps the layout under test independent of the runner's window.
   */
  function stubViewport(narrow: boolean): void {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: narrow,
      media: '',
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    } as unknown as MediaQueryList);
  }

  /** The portalled panel, wherever it currently lives in the DOM. */
  function panel(): HTMLElement | null {
    return document.getElementById('sheet-ms-listbox');
  }

  /** The portalled sheet backdrop, if one is rendered. */
  function backdrop(): HTMLElement | null {
    return document.querySelector('.mn-sheet-backdrop');
  }

  /** The shared bottom-sheet container (mn-bottom-sheet's chrome), if in sheet mode. */
  function sheet(): HTMLElement | null {
    return document.querySelector('.mn-sheet-container');
  }

  /** The mn-bottom-sheet host element that gets portalled to the body in sheet mode. */
  function sheetHost(): HTMLElement | null {
    return document.querySelector('mn-bottom-sheet');
  }

  /** The anchored popover wrapper (the trigger-positioned panel), if in popover mode. */
  function anchoredPanel(): HTMLElement | null {
    return document.querySelector('.max-h-60');
  }

  /** The search input inside the panel, if one is rendered (rendered by mn-lib-input-field). */
  function searchInput(): HTMLInputElement | null {
    return panel()?.querySelector('mn-lib-input-field input') ?? null;
  }

  /** Rebuilds the fixture so per-test prop tweaks are picked up before first render. */
  function build(props: Partial<MnMultiSelectProps>): void {
    fixture = TestBed.createComponent(SheetHostComponent);
    fixture.componentInstance.props = {...fixture.componentInstance.props, ...props};
    fixture.detectChanges();
    component = fixture.debugElement.query(By.directive(MnMultiSelect)).componentInstance;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SheetHostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {provide: MnLanguageService, useValue: languageStub},
      ],
    }).compileComponents();
  });

  afterEach(() => {
    // Defensive: strip any leaked overlay so tests stay isolated.
    panel()?.remove();
    backdrop()?.remove();
    sheetHost()?.remove();
  });

  describe('search threshold', () => {
    beforeEach(() => stubViewport(false));

    it('hides the search input just below the default threshold of 8', () => {
      build({options: optionsOfLength(7)});
      component.toggle();
      fixture.detectChanges();

      expect(component.isSearchable).toBeFalse();
      expect(searchInput()).toBeNull();
    });

    it('auto-enables the search input at the default threshold of 8', () => {
      build({options: optionsOfLength(8)});
      component.toggle();
      fixture.detectChanges();

      expect(component.isSearchable).toBeTrue();
      expect(searchInput()).not.toBeNull();
    });

    it('lets an explicit searchable:false suppress search on a long list', () => {
      build({options: optionsOfLength(20), searchable: false});
      component.toggle();
      fixture.detectChanges();

      expect(component.isSearchable).toBeFalse();
      expect(searchInput()).toBeNull();
    });

    it('lets an explicit searchable:true force search on a short list', () => {
      build({options: optionsOfLength(2), searchable: true});
      component.toggle();
      fixture.detectChanges();

      expect(component.isSearchable).toBeTrue();
      expect(searchInput()).not.toBeNull();
    });

    it('honours a custom searchThreshold instead of the default', () => {
      build({options: optionsOfLength(3), searchThreshold: 3});
      component.toggle();
      fixture.detectChanges();

      expect(component.isSearchable).toBeTrue();
      expect(searchInput()).not.toBeNull();
    });

    it('still filters the option list through the auto-enabled input', () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      component.onSearch('Option 1');
      fixture.detectChanges();

      // "Option 1" and "Option 10" — a substring match, so both survive.
      expect(component.filteredOptions.map(o => o.label)).toEqual(['Option 1', 'Option 10']);
    });
  });

  describe('narrow viewport', () => {
    beforeEach(() => stubViewport(true));

    it('renders the panel as a sheet with a backdrop', () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();

      expect(component.isSheet).toBeTrue();
      expect(sheet()).not.toBeNull();
      expect(backdrop()).not.toBeNull();
    });

    it('portals the sheet host to document.body so its fixed chrome anchors to the viewport', () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();

      // The whole mn-bottom-sheet host (backdrop + container) is relocated as one unit.
      expect(sheetHost()!.parentElement).toBe(document.body);
      expect(sheetHost()!.contains(backdrop())).toBeTrue();
      expect(sheetHost()!.contains(panel())).toBeTrue();
    });

    it('drops the trigger-relative inline position that only the anchored panel needs', () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();

      const el = panel()!;
      expect(el.style.top).toBe('');
      expect(el.style.left).toBe('');
      expect(el.style.width).toBe('');
    });

    it('stays open on scroll and resize, which the soft keyboard triggers', () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();

      // Focusing the search field fires `resize` on Android; closing there would
      // dismiss the sheet the instant the user tries to search.
      component.onWindowScrollOrResize();
      fixture.detectChanges();

      expect(component.isOpen).toBeTrue();
      expect(panel()).not.toBeNull();
    });

    it('closes on an outside click and tears down both overlays', () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();

      document.body.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      fixture.detectChanges();

      expect(component.isOpen).toBeFalse();
      expect(panel()).toBeNull();
      expect(backdrop()).toBeNull();
    });

    it('removes both overlays when destroyed while open', () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();

      fixture.destroy();

      expect(panel()).toBeNull();
      expect(backdrop()).toBeNull();
    });

    it('locks body scroll while open and restores the previous value on close', () => {
      document.body.style.overflow = 'auto';
      build({options: optionsOfLength(10)});

      component.toggle();
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('hidden');

      component.close();
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('auto');

      document.body.style.overflow = '';
    });

    it('captures a min-height floor once the sheet has opened', async () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();

      // The floor is measured on the next frame, so it is still null synchronously.
      expect(component.sheetFloorPx).toBeNull();

      await new Promise<void>(r => requestAnimationFrame(() => r()));
      fixture.detectChanges();

      expect(component.sheetFloorPx).not.toBeNull();
      expect(component.sheetFloorPx!).toBeGreaterThanOrEqual(0);
    });

    it('clears the floor when the sheet closes so the next open re-measures', async () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();
      await new Promise<void>(r => requestAnimationFrame(() => r()));

      component.close();
      fixture.detectChanges();

      expect(component.sheetFloorPx).toBeNull();
    });

    it('keeps the anchored panel when mobileSheet is disabled', () => {
      build({options: optionsOfLength(10), mobileSheet: false});
      component.toggle();
      fixture.detectChanges();

      expect(component.isSheet).toBeFalse();
      expect(backdrop()).toBeNull();
      expect(anchoredPanel()!.style.top).toMatch(/px$/);
    });
  });

  describe('wide viewport', () => {
    beforeEach(() => stubViewport(false));

    it('keeps the trigger-anchored panel and renders no backdrop', () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();

      expect(component.isSheet).toBeFalse();
      expect(sheet()).toBeNull();
      expect(backdrop()).toBeNull();
      expect(anchoredPanel()!.style.top).toMatch(/px$/);
    });

    it('leaves body scroll untouched', () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();

      expect(document.body.style.overflow).toBe('');
    });

    it('never captures a sheet floor for the anchored panel', async () => {
      build({options: optionsOfLength(10)});
      component.toggle();
      fixture.detectChanges();
      await new Promise<void>(r => requestAnimationFrame(() => r()));
      fixture.detectChanges();

      expect(component.sheetFloorPx).toBeNull();
    });
  });
});
