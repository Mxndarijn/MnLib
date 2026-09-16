import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {Subject} from 'rxjs';

import {MnSelect} from './mn-select';
import {MnSelectProps} from './mn-selectTypes';
import {MnConfigService} from '../../config';
import {MnLanguageService} from '../../language';

/**
 * Keyboard use of mn-select, the WAI-ARIA combobox pattern. Options used to be Tab stops reached
 * one Tab at a time with no arrow keys; now focus stays on the trigger or the search box and
 * `aria-activedescendant` names the option the arrows are on. Pinned to the anchored layout
 * (`mobileSheet: false`) so the result does not depend on the Karma iframe's width.
 */

/** Host with a form around the select, so a leaked Enter would show up as a submit. */
@Component({
  standalone: true,
  imports: [MnSelect, FormsModule],
  template: `
    <form (submit)="submitted = true; $event.preventDefault()">
      <mn-lib-select [props]="props" [(ngModel)]="value" name="choice"></mn-lib-select>
    </form>`,
})
class HostComponent {
  props: MnSelectProps = {
    id: 'kb-select',
    options: [
      {label: 'Alpha', value: 'a'},
      {label: 'Beta', value: 'b', disabled: true},
      {label: 'Gamma', value: 'c'},
      {label: 'Delta', value: 'd'},
    ],
    searchable: false,
    mobileSheet: false,
  };
  value: unknown = null;
  submitted = false;
}

describe('MnSelect (keyboard)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let component: MnSelect;

  /** The combobox trigger. */
  function trigger(): HTMLElement {
    return fixture.nativeElement.querySelector('[role="combobox"]');
  }

  /** The rendered options, wherever the portalled panel lives. */
  function options(): HTMLElement[] {
    return Array.from(document.querySelectorAll('#kb-select-listbox [role="option"]'));
  }

  /**
   * Presses a key the way a browser delivers it and lets the view update.
   * @param target - The focused element.
   * @param key - The KeyboardEvent key value.
   * @returns The event, to check whether the select claimed it.
   */
  async function press(target: HTMLElement, key: string): Promise<KeyboardEvent> {
    const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true});
    target.dispatchEvent(event);
    fixture.detectChanges();
    await fixture.whenStable();
    return event;
  }

  /**
   * Builds the host.
   * @param props - Props merged over the defaults.
   */
  async function build(props?: Partial<MnSelectProps>): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {provide: MnConfigService, useValue: {resolve: () => ({}) as never}},
        {
          provide: MnLanguageService,
          useValue: {
            locale$: new Subject<string>().asObservable(),
            translate: (key: string) => key,
            t: (key: string) => key,
            translateIfPresent: () => undefined,
          } as Partial<MnLanguageService>,
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    if (props) fixture.componentInstance.props = {...fixture.componentInstance.props, ...props};
    fixture.detectChanges();
    await fixture.whenStable();
    component = fixture.debugElement.query(By.directive(MnSelect)).componentInstance;
  }

  afterEach(() => {
    document.getElementById('kb-select-listbox')?.remove();
    document.getElementById('kb-select-shield')?.remove();
  });

  it('keeps options out of the Tab order', async () => {
    await build();
    await press(trigger(), 'ArrowDown');

    expect(options().length).toBe(4);
    expect(options().every(option => option.getAttribute('tabindex') === null)).toBeTrue();
  });

  it('opens on ArrowDown with the first option active, named by aria-activedescendant', async () => {
    await build();
    const event = await press(trigger(), 'ArrowDown');

    expect(event.defaultPrevented).toBeTrue();
    expect(component.isOpen).toBeTrue();
    expect(trigger().getAttribute('aria-activedescendant')).toBe('kb-select-option-0');
    expect(options()[0].id).toBe('kb-select-option-0');
  });

  it('opens on the selected option', async () => {
    await build();
    fixture.componentInstance.value = 'd';
    fixture.detectChanges();
    await fixture.whenStable();

    await press(trigger(), 'Enter');

    expect(trigger().getAttribute('aria-activedescendant')).toBe('kb-select-option-3');
  });

  it('skips disabled options and stops at the ends instead of wrapping', async () => {
    await build();
    await press(trigger(), 'ArrowDown');

    await press(trigger(), 'ArrowDown');
    expect(component.activeIndex).withContext('Beta is disabled').toBe(2);
    await press(trigger(), 'ArrowDown');
    await press(trigger(), 'ArrowDown');
    expect(component.activeIndex).toBe(3);

    await press(trigger(), 'Home');
    expect(component.activeIndex).toBe(0);
    await press(trigger(), 'ArrowUp');
    expect(component.activeIndex).toBe(0);
    await press(trigger(), 'End');
    expect(component.activeIndex).toBe(3);
  });

  it('chooses the active option with Enter without submitting the form, and closes', async () => {
    await build();
    await press(trigger(), 'ArrowDown');
    await press(trigger(), 'ArrowDown');

    const event = await press(trigger(), 'Enter');

    expect(event.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.value).toBe('c');
    expect(fixture.componentInstance.submitted).toBeFalse();
    expect(component.isOpen).toBeFalse();
    expect(trigger().getAttribute('aria-activedescendant')).toBeNull();
  });

  it('chooses with Space too', async () => {
    await build();
    await press(trigger(), ' ');
    await press(trigger(), ' ');

    expect(fixture.componentInstance.value).toBe('a');
  });

  it('closes on Escape without choosing', async () => {
    await build();
    await press(trigger(), 'ArrowDown');
    await press(trigger(), 'ArrowDown');

    await press(trigger(), 'Escape');

    expect(component.isOpen).toBeFalse();
    expect(fixture.componentInstance.value).toBeNull();
  });

  it('closes on Tab and leaves the Tab alone', async () => {
    await build();
    await press(trigger(), 'ArrowDown');

    const event = await press(trigger(), 'Tab');

    expect(component.isOpen).toBeFalse();
    expect(event.defaultPrevented).toBeFalse();
  });

  describe('with a search box', () => {
    /** The search input inside the panel. */
    function search(): HTMLInputElement {
      return document.getElementById('kb-select-search') as HTMLInputElement;
    }

    it('moves through the options from the search box and chooses with Enter', async () => {
      await build({searchable: true});
      await press(trigger(), 'ArrowDown');

      await press(search(), 'ArrowDown');
      expect(search().getAttribute('aria-activedescendant')).toBe('kb-select-option-2');

      await press(search(), 'Enter');
      expect(fixture.componentInstance.value).toBe('c');
      expect(document.activeElement).withContext('focus returns to the trigger').toBe(trigger());
    });

    it('highlights the first match while typing and leaves Space, Home and End to the text', async () => {
      await build({searchable: true});
      await press(trigger(), 'ArrowDown');

      component.onSearch('ta');
      fixture.detectChanges();
      expect(component.filteredOptions.map(option => option.label)).toEqual(['Beta', 'Delta']);
      expect(component.activeIndex).withContext('Beta is disabled, so Delta').toBe(1);

      for (const key of [' ', 'Home', 'End']) {
        const event = await press(search(), key);
        expect(event.defaultPrevented).withContext(key).toBeFalse();
      }
      expect(component.isOpen).toBeTrue();
    });
  });
});
