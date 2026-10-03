import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { MnInputField } from 'mn-angular-lib';
import { MnConfigService, MnLanguageService } from 'mn-angular-lib/core';

/** Config stub: the field only calls `resolve()`, which returns an empty config here. */
const configStub: Partial<MnConfigService> = {
  resolve: () => ({}) as never,
};

/** Language stub with identity translation and no locale changes. */
const languageStub: Partial<MnLanguageService> = {
  locale$: new Subject<string>().asObservable(),
  translate: (key: string) => key,
  t: (key: string) => key,
  translateIfPresent: () => undefined,
};

/**
 * A number field can show a fixed number of decimals, so an amount of 90.5 reads "90,50" like
 * every other amount on the page. Without the option it shows the number as it is.
 */
describe('MnInputField decimals', () => {
  let fixture: ComponentFixture<MnInputField>;
  let field: MnInputField;

  /** Creates a number field with the given decimals. */
  function create(decimals?: number): void {
    fixture = TestBed.createComponent(MnInputField);
    field = fixture.componentInstance;
    fixture.componentRef.setInput('props', { id: 'amount', type: 'number', decimals });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnInputField],
      providers: [
        { provide: MnConfigService, useValue: configStub },
        { provide: MnLanguageService, useValue: languageStub },
      ],
    }).compileComponents();
  });

  it('pads a written value to the fixed decimals', () => {
    create(2);
    field.writeValue(90.5);
    expect(field.value).toBe('90.50');
    field.writeValue(25);
    expect(field.value).toBe('25.00');
  });

  it('pads what was typed once the field loses focus', () => {
    create(2);
    field.value = '12.3';
    field.handleBlur();
    expect(field.value).toBe('12.30');
  });

  it('leaves an empty field empty', () => {
    create(2);
    field.writeValue(null);
    expect(field.value ?? '').toBe('');
  });

  it('shows the number as it is without the option', () => {
    create();
    field.writeValue(90.5);
    expect(field.value).toBe('90.5');
  });
});
