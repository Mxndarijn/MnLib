import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Subject} from 'rxjs';

import {MnSelect} from './mn-select';
import {MnSelectProps} from './mn-selectTypes';
import {MnConfigService} from '../../config';
import {MnLanguageService} from '../../language';

/**
 * Label resolution for the strings mn-select renders on its own behalf.
 *
 * The trigger's empty text, the search box's placeholder and the "nothing matched"
 * line are not caller data, and no call site is obliged to pass them — search
 * auto-enables once the option list reaches `searchThreshold`, so the box appears
 * without anyone opting in. Each therefore has to resolve through the config layer
 * and a conventional translation key before falling back to English; without the key
 * step an app could only translate them by repeating the same literal at every
 * instance, which is how they stay English in practice.
 */

/** Host rendering the select with whatever props a test assigns. */
@Component({
  standalone: true,
  imports: [MnSelect],
  template: `
    <mn-lib-select [props]="props"></mn-lib-select>`,
})
class HostComponent {
  props: MnSelectProps = {
    id: 'test-select',
    options: [
      {label: 'Alpha', value: 'a'},
      {label: 'Beta', value: 'b'},
    ],
    searchable: true,
    mobileSheet: false,
  };
}

describe('MnSelect (own labels)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let component: MnSelect;

  /** Translations the language stub reports as defined for the current test. */
  let bundle: Record<string, string>;

  /** Config the config stub resolves for the select in the current test. */
  let config: Record<string, string>;

  /**
   * Builds the component with the current `bundle`/`config`.
   * @param props Props merged over the host's defaults.
   */
  async function build(props?: Partial<MnSelectProps>): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {provide: MnConfigService, useValue: {resolve: () => config as never}},
        {
          provide: MnLanguageService,
          useValue: {
            locale$: new Subject<string>().asObservable(),
            translate: (key: string) => bundle[key] ?? key,
            t: (key: string) => bundle[key] ?? key,
            translateIfPresent: (key: string) => bundle[key],
          } as Partial<MnLanguageService>,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    if (props) {
      fixture.componentInstance.props = {...fixture.componentInstance.props, ...props};
    }
    fixture.detectChanges();
    component = fixture.debugElement.query(By.directive(MnSelect)).componentInstance;
  }

  beforeEach(() => {
    bundle = {};
    config = {};
  });

  afterEach(() => {
    document.getElementById('test-select-listbox')?.remove();
    document.getElementById('test-select-shield')?.remove();
  });

  it('falls back to English when nothing is configured and no key is defined', async () => {
    await build();

    expect(component.placeholderLabel).toBe('Select...');
    expect(component.searchPlaceholderLabel).toBe('Search...');
    expect(component.noOptionsLabel).toBe('No options found');
  });

  it('uses the conventional keys once the app defines them', async () => {
    bundle = {
      'mnSelect.placeholder': 'Selecteer...',
      'mnSelect.search': 'Zoeken...',
      'mnSelect.noOptions': 'Geen opties gevonden',
    };
    await build();

    expect(component.placeholderLabel).toBe('Selecteer...');
    expect(component.searchPlaceholderLabel).toBe('Zoeken...');
    expect(component.noOptionsLabel).toBe('Geen opties gevonden');
  });

  it('prefers resolved config over the conventional key', async () => {
    bundle = {'mnSelect.search': 'from key'};
    config = {searchPlaceholder: 'from config'};
    await build();

    expect(component.searchPlaceholderLabel).toBe('from config');
  });

  it('prefers an explicit prop over both config and the key', async () => {
    bundle = {'mnSelect.search': 'from key'};
    config = {searchPlaceholder: 'from config'};
    await build({searchPlaceholder: 'from props'});

    expect(component.searchPlaceholderLabel).toBe('from props');
  });

  it('shows the resolved placeholder in the trigger until an option is selected', async () => {
    bundle = {'mnSelect.placeholder': 'Selecteer...'};
    await build();

    expect(component.displayText).toBe('Selecteer...');

    component.writeValue('a');
    fixture.detectChanges();

    expect(component.displayText).toBe('Alpha');
  });
});
