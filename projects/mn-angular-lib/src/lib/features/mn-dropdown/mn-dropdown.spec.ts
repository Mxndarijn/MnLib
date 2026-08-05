import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Subject} from 'rxjs';

import {MnDropdown, MnDropdownProps} from 'mn-angular-lib';
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
      <mn-lib-dropdown [props]="props"></mn-lib-dropdown>
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
    component.select(host.props.actions[2]);
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

describe('MnDropdown (label resolution)', () => {
  @Component({
    standalone: true,
    imports: [MnDropdown],
    template: `<mn-lib-dropdown [props]="props"></mn-lib-dropdown>`,
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

    expect(component.actionLabel(fixture.componentInstance.props.actions[0])).toBe('Bewerken');
  });
});
