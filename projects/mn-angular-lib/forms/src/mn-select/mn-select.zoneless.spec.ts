import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { MnSelect } from './mn-select';
import { MnSelectProps } from './mn-selectTypes';
import { MnConfigService, MnLanguageService } from 'mn-angular-lib/core';

/** The config the stub currently resolves for the select; a locale change rewrites it. */
let resolved: Record<string, string>;

/** Locale changes the language stub publishes. It replays the current locale on subscribe,
 *  like the real service, because the components skip(1) that first value. */
let locale$: BehaviorSubject<string>;

/** Host binding the select to a reactive control, which is how an app drives one. */
@Component({
  standalone: true,
  imports: [MnSelect, ReactiveFormsModule],
  template: `<mn-lib-select [props]="props" [formControl]="control"></mn-lib-select>`,
})
class HostComponent {
  readonly control = new FormControl<string | null>(null, Validators.required);
  props: MnSelectProps = {
    id: 'zoneless-select',
    options: [
      { label: 'Alpha', value: 'a' },
      { label: 'Beta', value: 'b' },
    ],
    mobileSheet: false,
  };
}

/**
 * Regression coverage for the two ways this control's state changes with no event behind it.
 *
 * The component is OnPush, so a value pushed in by the forms API and a config re-resolved on a
 * locale change both have to mark the view themselves; a zoneless app skips a view nobody marked.
 * Neither spec calls `detectChanges()` after the act — forcing a render is what would hide the bug.
 */
describe('MnSelect (zoneless change detection)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    resolved = {};
    locale$ = new BehaviorSubject<string>('en');

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MnConfigService, useValue: { resolve: () => resolved as never } },
        {
          provide: MnLanguageService,
          useValue: {
            locale$: locale$.asObservable(),
            translate: (key: string) => key,
            t: (key: string) => key,
            translateIfPresent: () => undefined,
          } as Partial<MnLanguageService>,
        },
      ],
    }).compileComponents();
  });

  /** Renders the host and hands change detection to Angular's own scheduler. */
  async function render(): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  /** Everything the select currently renders, whitespace collapsed. */
  function rendered(): string {
    return (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  it('shows a value the form writes in', async () => {
    await render();
    expect(rendered()).not.toContain('Beta');

    // setValue reaches the component through writeValue, not through a listener.
    fixture.componentInstance.control.setValue('b');
    await fixture.whenStable();

    expect(rendered()).toContain('Beta');
  });

  it('renders the disabled state the form pushes in', async () => {
    await render();
    // The trigger is not a <button>; the disabled state shows as aria-disabled, a greyed-out
    // class and a removed tab stop.
    const trigger = (): HTMLElement => fixture.nativeElement.querySelector('#zoneless-select');
    expect(trigger().getAttribute('aria-disabled')).toBeNull();
    expect(trigger().getAttribute('tabindex')).toBe('0');

    // disable() reaches the component through setDisabledState, the same way setValue reaches
    // writeValue: from the forms API, with no event behind it.
    fixture.componentInstance.control.disable();
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-disabled')).toBe('true');
    expect(trigger().getAttribute('tabindex')).toBe('-1');
    expect(trigger().classList).toContain('opacity-60');
  });

  it('reveals the error state when the form marks the control touched', async () => {
    await render();
    // `showError` drives aria-describedby; the control is required and still empty, so the
    // only thing missing is `touched`.
    const trigger = (): HTMLElement => fixture.nativeElement.querySelector('#zoneless-select');
    expect(trigger().getAttribute('aria-describedby')).toBeNull();

    // What a form does when the user tries to submit an incomplete page.
    fixture.componentInstance.control.markAsTouched();
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-describedby')).toBe('zoneless-select-error');
  });

  it('re-renders its label when the locale changes', async () => {
    resolved = { label: 'Country' };
    await render();
    expect(rendered()).toContain('Country');

    // The language service publishes the new locale and calls appRef.tick(); under OnPush that
    // tick passes over every view that did not ask to be checked.
    resolved = { label: 'Land' };
    locale$.next('nl');
    await fixture.whenStable();

    expect(rendered()).toContain('Land');
  });
});
