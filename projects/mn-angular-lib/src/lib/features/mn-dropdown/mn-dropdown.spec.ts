import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {LucideChevronDown, LucideEllipsisVertical} from '@lucide/angular';
import {Subject} from 'rxjs';

import {MnDropdown, MnDropdownAction, MnDropdownProps} from 'mn-angular-lib';
import {MnConfigService} from '../../config';
import {MnLanguageService} from '../../language';

/** Minimal config stub — the component only calls `resolve()`, which returns an empty config here. */
const configStub: Partial<MnConfigService> = {
  resolve: () => ({}) as never,
};

/** Language stub: never-emitting locale stream and identity translation. `translateIfPresent`
 *  returns undefined so `label`/`ariaLabel` fallbacks are exercised unless a test opts into keys. */
const languageStub: Partial<MnLanguageService> = {
  locale$: new Subject<string>().asObservable(),
  translate: (key: string) => key,
  t: (key: string) => key,
  translateIfPresent: () => undefined,
};

/** Host that places the dropdown inside a `transform`ed ancestor — the containing-block bug trigger. */
@Component({
  standalone: true,
  imports: [MnDropdown],
  template: `
    <div class="transformed-ancestor" style="transform: translateY(20px); position: relative;">
      <mn-lib-dropdown [datasource]="props"></mn-lib-dropdown>
    </div>
  `,
})
class HostComponent {
  edit = jasmine.createSpy('edit');
  remove = jasmine.createSpy('remove');
  props: MnDropdownProps = {
    id: 'test-dd',
    mobileSheet: false,
    actions: [
      {label: 'Edit', run: this.edit},
      {label: 'Delete', danger: true, run: this.remove},
      {label: 'Disabled', disabled: true, run: () => undefined},
    ],
  };
}

/** Stubs `matchMedia` so the layout under test is independent of the runner's window width. */
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

describe('MnDropdown (anchored popover)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let component: MnDropdown;

  function menu(): HTMLElement | null {
    return document.getElementById('test-dd-menu');
  }

  function items(): HTMLButtonElement[] {
    return Array.from(menu()?.querySelectorAll('[role="menuitem"]') ?? []) as HTMLButtonElement[];
  }

  function separators(): HTMLElement[] {
    return Array.from(menu()?.querySelectorAll('hr[role="separator"]') ?? []) as HTMLElement[];
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {provide: MnLanguageService, useValue: languageStub},
      ],
    }).compileComponents();

    stubViewport(false);
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    component = fixture.debugElement.query(By.directive(MnDropdown)).componentInstance;
  });

  afterEach(() => {
    menu()?.remove();
  });

  it('renders no menu while closed', () => {
    expect(menu()).toBeNull();
  });

  it('portals the popover to document.body (not the transformed ancestor) when opened', () => {
    component.toggle();
    fixture.detectChanges();

    const el = menu();
    expect(el).withContext('menu should render when open').not.toBeNull();
    expect(el!.parentElement).toBe(document.body);
    expect(el!.closest('.transformed-ancestor')).toBeNull();
  });

  it('positions the popover from the trigger rect, right-aligned via a fixed layout', () => {
    component.toggle();
    fixture.detectChanges();

    const el = menu()!;
    expect(el.classList.contains('fixed')).toBeTrue();
    // Right-aligned to the trigger: anchored at the trigger's right edge and pulled back
    // by its own width with `-translate-x-full`.
    expect(el.classList.contains('-translate-x-full')).toBeTrue();
    expect(el.style.top).toMatch(/px$/);
    expect(el.style.left).toMatch(/px$/);
  });

  it('renders one menuitem per action', () => {
    component.toggle();
    fixture.detectChanges();
    expect(items().length).toBe(3);
    expect(items()[0].textContent).toContain('Edit');
  });

  it('renders a separator entry as an <hr>, not a menuitem', () => {
    host.props = {
      ...host.props,
      actions: [
        {label: 'Profile', run: () => undefined},
        {separator: true},
        {label: 'Logout', danger: true, run: () => undefined},
      ],
    };
    fixture.detectChanges();
    component.toggle();
    fixture.detectChanges();

    expect(items().length).withContext('separators are not menuitems').toBe(2);
    expect(separators().length).toBe(1);
    // The divider sits between the two commands, in declared order.
    const rendered = Array.from(menu()!.querySelectorAll('[role="menuitem"], hr[role="separator"]'));
    expect(rendered.map(el => el.tagName.toLowerCase())).toEqual(['button', 'hr', 'button']);
  });

  it('skips separators when running the first visible action (Enter)', () => {
    const first = jasmine.createSpy('first');
    host.props = {
      ...host.props,
      actions: [{separator: true}, {label: 'First', run: first}],
    };
    fixture.detectChanges();
    component.toggle();
    fixture.detectChanges();

    component.selectFirstVisible();
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('drops separators from the filtered results while searching', () => {
    host.props = {
      ...host.props,
      searchable: true,
      actions: [
        {label: 'Edit', run: () => undefined},
        {separator: true},
        {label: 'Delete', run: () => undefined},
      ],
    };
    fixture.detectChanges();
    component.toggle();
    fixture.detectChanges();

    component.onSearch('e');
    // Both commands match 'e'; the separator between them must not survive the filter.
    expect(component.filteredActions.some(i => component.isSeparator(i))).toBeFalse();
    expect(component.filteredActions.length).toBe(2);
  });

  it('fires the chosen action and closes', () => {
    component.toggle();
    fixture.detectChanges();

    items()[0].click();
    fixture.detectChanges();

    expect(host.edit).toHaveBeenCalledTimes(1);
    expect(component.isOpen).toBeFalse();
    expect(menu()).toBeNull();
  });

  it('does not fire a disabled action', () => {
    component.toggle();
    fixture.detectChanges();

    const disabled = items()[2];
    expect(disabled.disabled).toBeTrue();
    // Even if a click is forced past the disabled attribute, the handler guards.
    component.select(host.props.actions[2] as MnDropdownAction);
    expect(component.isOpen).toBeTrue();
  });

  it('marks the danger action with the error colour class', () => {
    component.toggle();
    fixture.detectChanges();
    expect(items()[1].classList.contains('text-error')).toBeTrue();
  });

  it('closes on an outside document click', () => {
    component.toggle();
    fixture.detectChanges();
    expect(component.isOpen).toBeTrue();

    document.body.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    fixture.detectChanges();

    expect(component.isOpen).toBeFalse();
    expect(menu()).toBeNull();
  });

  it('closes on Escape', () => {
    component.toggle();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    fixture.detectChanges();

    expect(component.isOpen).toBeFalse();
    expect(menu()).toBeNull();
  });

  it('closes on window scroll', () => {
    component.toggle();
    fixture.detectChanges();

    component.onWindowScrollOrResize();
    fixture.detectChanges();

    expect(component.isOpen).toBeFalse();
    expect(menu()).toBeNull();
  });

  it('removes the portalled menu when destroyed while open', () => {
    component.toggle();
    fixture.detectChanges();
    expect(menu()).not.toBeNull();

    fixture.destroy();
    expect(menu()).toBeNull();
  });

  it('does not lock the panel height when not searchable', () => {
    component.toggle();
    fixture.detectChanges();
    expect(component.panelFloorPx).toBeNull();
    expect(menu()!.style.height).toBe('');
  });

  it('does not open when there are no actions', () => {
    host.props = {id: 'test-dd', mobileSheet: false, actions: []};
    fixture.detectChanges();
    component.toggle();
    fixture.detectChanges();

    expect(component.isOpen).toBeFalse();
    expect(menu()).toBeNull();
  });
});

describe('MnDropdown (mobile sheet)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let component: MnDropdown;

  function menu(): HTMLElement | null {
    return document.getElementById('test-dd-menu');
  }

  function sheetHost(): HTMLElement | null {
    return document.querySelector('mn-bottom-sheet');
  }

  function backdrop(): HTMLElement | null {
    return document.querySelector('.mn-sheet-backdrop');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {provide: MnLanguageService, useValue: languageStub},
      ],
    }).compileComponents();

    stubViewport(true);
    fixture = TestBed.createComponent(HostComponent);
    // The default host pins mobileSheet:false; opt back into the sheet for this suite.
    fixture.componentInstance.props = {...fixture.componentInstance.props, mobileSheet: true};
    fixture.detectChanges();
    component = fixture.debugElement.query(By.directive(MnDropdown)).componentInstance;
  });

  afterEach(() => {
    menu()?.remove();
    sheetHost()?.remove();
  });

  it('renders the menu as a bottom sheet with a backdrop', () => {
    component.toggle();
    fixture.detectChanges();

    expect(component.isSheet).toBeTrue();
    expect(sheetHost()).not.toBeNull();
    expect(backdrop()).not.toBeNull();
  });

  it('portals the sheet host to document.body so its fixed chrome anchors to the viewport', () => {
    component.toggle();
    fixture.detectChanges();

    expect(sheetHost()!.parentElement).toBe(document.body);
    expect(sheetHost()!.contains(menu())).toBeTrue();
  });

  it('stays open on scroll/resize, which the soft keyboard triggers', () => {
    component.toggle();
    fixture.detectChanges();

    component.onWindowScrollOrResize();
    fixture.detectChanges();

    expect(component.isOpen).toBeTrue();
    expect(menu()).not.toBeNull();
  });

  it('locks body scroll while open and restores it on close', () => {
    document.body.style.overflow = 'auto';
    component.toggle();
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    component.close();
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('auto');

    document.body.style.overflow = '';
  });
});

describe('MnDropdown (trigger presentation)', () => {
  @Component({
    standalone: true,
    imports: [MnDropdown],
    template: `<mn-lib-dropdown [datasource]="props"></mn-lib-dropdown>`,
  })
  class TriggerHostComponent {
    props: MnDropdownProps = {
      id: 'trig-dd',
      mobileSheet: false,
      actions: [{label: 'Edit', run: () => undefined}],
    };
  }

  let fixture: ComponentFixture<TriggerHostComponent>;
  let host: TriggerHostComponent;
  let component: MnDropdown;

  function trigger(): HTMLElement {
    return document.getElementById('trig-dd')!;
  }

  function build(props: Partial<MnDropdownProps>): void {
    fixture = TestBed.createComponent(TriggerHostComponent);
    host = fixture.componentInstance;
    host.props = {...host.props, ...props};
    fixture.detectChanges();
    component = fixture.debugElement.query(By.directive(MnDropdown)).componentInstance;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TriggerHostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {provide: MnLanguageService, useValue: languageStub},
      ],
    }).compileComponents();
    stubViewport(false);
  });

  it('generates a stable id for the a11y wiring when none is provided', () => {
    build({id: undefined});
    expect(component.resolvedId).toMatch(/^mn-dropdown-\d+$/);
    // The trigger button carries the generated id, so aria-controls/menu id stay valid.
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.id).toBe(component.resolvedId);
  });

  it('defaults to an icon-only vertical-dots trigger with an aria-label', () => {
    build({});
    expect(component.triggerLabelText).toBeNull();
    // Icon-only default resolves to the vertical-dots lucide data, not a template.
    expect(component.triggerIconTemplate).toBeNull();
    expect(component.triggerIconData?.data).toBe(LucideEllipsisVertical.icon);
    // No visible label (the label span carries `truncate`); the glyph span is expected.
    expect(trigger().querySelector('span.truncate')).toBeNull();
    expect(trigger().querySelector('svg')).not.toBeNull();
    expect(trigger().getAttribute('aria-label')).toBe('Actions');
  });

  it('renders visible text and a trailing chevron when triggerLabel is set', () => {
    build({triggerLabel: 'Actions'});
    expect(component.triggerLabelText).toBe('Actions');
    // A labelled trigger defaults to the (dimmed) chevron.
    expect(component.triggerIconData?.data).toBe(LucideChevronDown.icon);
    expect(component.triggerIconData?.dim).toBeTrue();
    expect(trigger().querySelector('span')?.textContent).toContain('Actions');
    // With visible text the accessible name comes from the content, so no aria-label.
    expect(trigger().getAttribute('aria-label')).toBeNull();
  });

  it('honours triggerIcon:none for a text-only trigger', () => {
    build({triggerLabel: 'More', triggerIcon: 'none'});
    expect(component.triggerIconTemplate).toBeNull();
    expect(component.triggerIconData).toBeNull();
    expect(trigger().querySelector('svg')).toBeNull();
    expect(trigger().querySelector('span')?.textContent).toContain('More');
  });

  it('resolves triggerLabelKey via the language service', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TriggerHostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {
          provide: MnLanguageService,
          useValue: {...languageStub, translateIfPresent: (k: string) => (k === 'menu.more' ? 'Meer' : undefined)},
        },
      ],
    }).compileComponents();
    build({triggerLabelKey: 'menu.more', triggerLabel: 'More'});
    expect(component.triggerLabelText).toBe('Meer');
  });
});

describe('MnDropdown (action colour)', () => {
  @Component({
    standalone: true,
    imports: [MnDropdown],
    template: `<mn-lib-dropdown [datasource]="props"></mn-lib-dropdown>`,
  })
  class ColourHostComponent {
    props: MnDropdownProps = {id: 'col-dd', mobileSheet: false, actions: [{label: 'x', run: () => undefined}]};
  }

  it('resolves the foreground class from color, danger, then the default', async () => {
    await TestBed.configureTestingModule({
      imports: [ColourHostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {provide: MnLanguageService, useValue: languageStub},
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ColourHostComponent);
    fixture.detectChanges();
    const c = fixture.debugElement.query(By.directive(MnDropdown)).componentInstance as MnDropdown;

    expect(c.actionColorClass({label: 'a', run: () => undefined})).toBe('text-base-content');
    expect(c.actionColorClass({label: 'a', danger: true, run: () => undefined})).toBe('text-error');
    expect(c.actionColorClass({label: 'a', color: 'success', run: () => undefined})).toBe('text-success');
    // An explicit colour wins over the danger shorthand.
    expect(c.actionColorClass({label: 'a', color: 'primary', danger: true, run: () => undefined})).toBe('text-primary');
  });
});

describe('MnDropdown (custom template trigger)', () => {
  @Component({
    standalone: true,
    imports: [MnDropdown],
    template: `
      <ng-template #glyph><img class="avatar" src="" alt="" /></ng-template>
      <mn-lib-dropdown
        [datasource]="{id: 'tpl-dd', mobileSheet: false, triggerIcon: glyph, actions: [{label: 'x', run: noop}]}"
      ></mn-lib-dropdown>
    `,
  })
  class TplHostComponent {
    noop = (): void => undefined;
  }

  it('lets a template trigger size itself instead of forcing the preset square-box', async () => {
    await TestBed.configureTestingModule({
      imports: [TplHostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {provide: MnLanguageService, useValue: languageStub},
      ],
    }).compileComponents();
    stubViewport(false);
    const fixture = TestBed.createComponent(TplHostComponent);
    fixture.detectChanges();
    const c = fixture.debugElement.query(By.directive(MnDropdown)).componentInstance as MnDropdown;

    // No `h-7 w-7` square-box — the projected content defines the trigger's size.
    expect(c.triggerClasses).toBe('gap-x-1.5');
    expect(c.triggerClasses).not.toContain('h-7');
    // The projected avatar renders inside the trigger (no triggerButton needed).
    expect(fixture.nativeElement.querySelector('img.avatar')).not.toBeNull();
  });
});

describe('MnDropdown (label resolution)', () => {
  @Component({
    standalone: true,
    imports: [MnDropdown],
    template: `<mn-lib-dropdown [datasource]="props"></mn-lib-dropdown>`,
  })
  class KeyHostComponent {
    props: MnDropdownProps = {
      id: 'key-dd',
      mobileSheet: false,
      actions: [{labelKey: 'actions.edit', label: 'fallback', run: () => undefined}],
    };
  }

  it('prefers a resolved translation key over the literal label', async () => {
    await TestBed.configureTestingModule({
      imports: [KeyHostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {
          provide: MnLanguageService,
          useValue: {
            ...languageStub,
            translateIfPresent: (key: string) => (key === 'actions.edit' ? 'Bewerken' : undefined),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(KeyHostComponent);
    fixture.detectChanges();
    const component = fixture.debugElement.query(By.directive(MnDropdown)).componentInstance as MnDropdown;

    expect(component.actionLabel(fixture.componentInstance.props.actions[0] as MnDropdownAction)).toBe('Bewerken');
  });
});

describe('MnDropdown (searchable)', () => {
  @Component({
    standalone: true,
    imports: [MnDropdown],
    template: `<mn-lib-dropdown [datasource]="props"></mn-lib-dropdown>`,
  })
  class SearchHostComponent {
    copy = jasmine.createSpy('copy');
    copyLink = jasmine.createSpy('copyLink');
    edit = jasmine.createSpy('edit');
    props: MnDropdownProps = {
      id: 'search-dd',
      mobileSheet: false,
      searchable: true,
      actions: [
        // A disabled action ordered before an enabled match, so "Enter picks first" can be
        // shown to skip it. Its unique keyword lets a query isolate the disabled item alone.
        {label: 'Copy', disabled: true, keywords: 'archived', run: this.copy},
        {label: 'Copy link', run: this.copyLink},
        // `keywords` lets search match beyond the visible label.
        {label: 'Edit', keywords: 'modify', run: this.edit},
      ],
    };
  }

  let fixture: ComponentFixture<SearchHostComponent>;
  let host: SearchHostComponent;
  let component: MnDropdown;

  function menu(): HTMLElement | null {
    return document.getElementById('search-dd-menu');
  }

  function items(): HTMLButtonElement[] {
    return Array.from(menu()?.querySelectorAll('[role="menuitem"]') ?? []) as HTMLButtonElement[];
  }

  function searchInput(): HTMLInputElement | null {
    return document.getElementById('search-dd-search') as HTMLInputElement | null;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchHostComponent],
      providers: [
        {provide: MnConfigService, useValue: configStub},
        {provide: MnLanguageService, useValue: languageStub},
      ],
    }).compileComponents();

    stubViewport(false);
    fixture = TestBed.createComponent(SearchHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    component = fixture.debugElement.query(By.directive(MnDropdown)).componentInstance;
    component.toggle();
    fixture.detectChanges();
  });

  afterEach(() => {
    menu()?.remove();
  });

  it('renders the search input at the top of the popover when searchable', () => {
    expect(searchInput()).not.toBeNull();
    expect(items().length).toBe(3);
  });

  it('filters by label as the query changes', () => {
    component.onSearch('link');
    fixture.detectChanges();

    expect((component.filteredActions as MnDropdownAction[]).map(a => a.label)).toEqual(['Copy link']);
    expect(items().length).toBe(1);
  });

  it('matches keywords, not only the visible label', () => {
    component.onSearch('modify');
    fixture.detectChanges();

    expect((component.filteredActions as MnDropdownAction[]).map(a => a.label)).toEqual(['Edit']);
  });

  it('shows a centered icon + label empty state when nothing matches', () => {
    component.onSearch('nothing-here');
    fixture.detectChanges();

    expect(items().length).toBe(0);
    const empty = menu()!.querySelector('.justify-center');
    expect(empty).withContext('empty state is centered').not.toBeNull();
    expect(empty!.querySelector('svg')).withContext('empty state shows an icon').not.toBeNull();
    expect(empty!.textContent).toContain('No results');
  });

  it('Enter runs the first visible action, skipping a disabled one', () => {
    component.onSearch('copy');
    fixture.detectChanges();

    component.selectFirstVisible();

    expect(host.copy).not.toHaveBeenCalled();
    expect(host.copyLink).toHaveBeenCalledTimes(1);
    expect(component.isOpen).toBeFalse();
  });

  it('Enter on the search input bubbles to the wrapper and runs the first match', () => {
    component.onSearch('link');
    fixture.detectChanges();

    searchInput()!.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    fixture.detectChanges();

    expect(host.copyLink).toHaveBeenCalledTimes(1);
  });

  it('Enter is a no-op when only a disabled action matches', () => {
    // Its unique keyword isolates the disabled "Copy" as the sole match.
    component.onSearch('archived');
    fixture.detectChanges();
    // Active search filters out any separators, so every result is a command here.
    const matches = component.filteredActions as MnDropdownAction[];
    expect(matches.map(a => a.label)).toEqual(['Copy']);
    expect(matches.every(a => a.disabled)).withContext('only match is disabled').toBeTrue();

    component.selectFirstVisible();

    expect(host.copy).not.toHaveBeenCalled();
    expect(component.isOpen).withContext('menu stays open when no enabled action matches').toBeTrue();
  });

  it('locks the popover height so filtering does not resize it', async () => {
    // The floor is captured on the animation frame after open, with the full list; a CD
    // pass then writes it to the panel's inline height (markForCheck drives this in the app).
    await new Promise(requestAnimationFrame);
    fixture.detectChanges();
    const locked = component.panelFloorPx;
    expect(locked).withContext('a floor height is captured on open').toBeGreaterThan(0);
    expect(menu()!.style.height).toBe(`${locked}px`);

    component.onSearch('link'); // narrows to a single visible item
    fixture.detectChanges();
    await new Promise(requestAnimationFrame);
    fixture.detectChanges();

    expect(items().length).toBe(1);
    expect(component.panelFloorPx).withContext('locked height survives filtering').toBe(locked);
    expect(menu()!.style.height).toBe(`${locked}px`);
  });

  it('releases the locked height on close', async () => {
    await new Promise(requestAnimationFrame);
    expect(component.panelFloorPx).toBeGreaterThan(0);

    component.close();
    expect(component.panelFloorPx).toBeNull();
  });

  it('restores the full list when the field is cleared (CVA emits null for empty)', () => {
    component.onSearch('link');
    fixture.detectChanges();
    expect(items().length).toBe(1);

    // The text input's ControlValueAccessor emits null — not '' — for an empty field.
    component.onSearch(null);
    fixture.detectChanges();

    expect(component.searchTerm).toBe('');
    expect(component.filteredActions.length).toBe(host.props.actions.length);
    expect(items().length).toBe(host.props.actions.length);
  });

  it('clears the query when the menu closes', () => {
    component.onSearch('link');
    expect(component.searchTerm).toBe('link');

    component.close();
    expect(component.searchTerm).toBe('');
  });
});
