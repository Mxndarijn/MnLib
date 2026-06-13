import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BehaviorSubject } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ModalBuilder } from '../builder/modal.builder';
import { MnFormBodyComponent } from '../components/mn-form-body/mn-form-body.component';
import { MnWizardBodyComponent } from '../components/mn-wizard-body/mn-wizard-body.component';
import {
  FieldKind,
  ModalCloseReason,
  ModalI18nLabels,
  ColorFieldConfig,
  RatingFieldConfig,
  SliderFieldConfig,
  FormModalConfig,
  WizardModalConfig,
} from '../mn-modal.types';
import {MnModalRef} from '../mn-modal-ref';
import { TableDataSource, ColumnSortType } from '../../mn-table/mn-table.types';

type TestRow = { id: string; name: string; email: string; }

function createTestDataSource(rows?: TestRow[]): TableDataSource<TestRow> {
  const data = rows || [
    { id: '1', name: 'Alice', email: 'alice@test.com' },
    { id: '2', name: 'Bob', email: 'bob@test.com' },
  ];
  return {
    dataRows: new BehaviorSubject<TestRow[]>(data),
    columns: [
      { key: 'name', header: 'Name', cell: (r: TestRow) => r.name, sortType: ColumnSortType.ALPHABETICAL },
      { key: 'email', header: 'Email', cell: (r: TestRow) => r.email },
    ],
    getID: (r: TestRow) => r.id,
    emptyMessage: 'No rows',
    isDataLoading: false,
    canSearch: false,
  };
}

function createMockModalRef(): MnModalRef<unknown> {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: { subscribe: () => {} },
  } as unknown as MnModalRef<unknown>;
}

// =============================================================
// Feature 9: onCancel / onDismiss Callback on Builders
// =============================================================
describe('Feature 9: onCancel / onDismiss Callback', () => {
  it('should include onCancel in form builder config', () => {
    const handler = jasmine.createSpy('onCancel');
    const config = ModalBuilder.form()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .onCancel(handler)
      .build();

    expect(config.onCancel).toBe(handler);
  });

  it('should include onCancel in wizard builder config', () => {
    const handler = jasmine.createSpy('onCancel');
    const config = ModalBuilder.wizard()
      .addStep('S1', (s) => s.body('Hello'))
      .onCancel(handler)
      .build();

    expect(config.onCancel).toBe(handler);
  });

  it('should include onCancel in confirmation builder config', () => {
    const handler = jasmine.createSpy('onCancel');
    const config = ModalBuilder.confirmation()
      .message('Sure?')
      .onCancel(handler)
      .build();

    expect(config.onCancel).toBe(handler);
  });

  it('should include onCancel in custom builder config', () => {
    const handler = jasmine.createSpy('onCancel');
    const config = ModalBuilder.custom()
      .onCancel(handler)
      .build();

    expect(config.onCancel).toBe(handler);
  });

  it('should not have onCancel when not set', () => {
    const config = ModalBuilder.form()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .build();

    expect(config.onCancel).toBeUndefined();
  });

  describe('Wizard onCancel integration', () => {
    let component: MnWizardBodyComponent;
    let fixture: ComponentFixture<MnWizardBodyComponent>;
    let mockModalRef: MnModalRef<unknown>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MnWizardBodyComponent, HttpClientTestingModule],
      }).compileComponents();
    });

    it('should call onCancel when back() is pressed on first step', async () => {
      const cancelSpy = jasmine.createSpy('onCancel');
      const config = ModalBuilder.wizard()
        .addStep('Step 1', (s) => s.body('Only'))
        .onCancel(cancelSpy)
        .build();

      fixture = TestBed.createComponent(MnWizardBodyComponent);
      component = fixture.componentInstance;
      mockModalRef = createMockModalRef();
      component.config = config as WizardModalConfig;
      component.modalRef = mockModalRef;
      fixture.detectChanges();

      await component.back();

      expect(cancelSpy).toHaveBeenCalledWith(ModalCloseReason.CANCELLED);
      expect(mockModalRef.dismiss).toHaveBeenCalledWith(ModalCloseReason.CANCELLED);
    });

    it('should not call onCancel when navigating back (not on first step)', async () => {
      const cancelSpy = jasmine.createSpy('onCancel');
      const config = ModalBuilder.wizard()
        .addStep('Step 1', (s) => s.body('A'))
        .addStep('Step 2', (s) => s.body('B'))
        .onCancel(cancelSpy)
        .build();

      fixture = TestBed.createComponent(MnWizardBodyComponent);
      component = fixture.componentInstance;
      mockModalRef = createMockModalRef();
      component.config = config as WizardModalConfig;
      component.modalRef = mockModalRef;
      fixture.detectChanges();

      await component.next();
      await component.back();

      expect(cancelSpy).not.toHaveBeenCalled();
    });
  });
});

// =============================================================
// Feature 10: i18n / Localization Support
// =============================================================
describe('Feature 10: i18n / Localization Support', () => {
  it('should include i18n labels in form builder config', () => {
    const labels: ModalI18nLabels = {
      submit: 'Enviar',
      cancel: 'Cancelar',
    };
    const config = ModalBuilder.form()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .i18n(labels)
      .build();

    expect(config.i18n).toEqual(labels);
  });

  it('should include i18n labels in wizard builder config', () => {
    const labels: ModalI18nLabels = {
      next: 'Volgende',
      back: 'Terug',
      complete: 'Voltooien',
    };
    const config = ModalBuilder.wizard()
      .addStep('S1', (s) => s.body(''))
      .i18n(labels)
      .build();

    expect(config.i18n).toEqual(labels);
  });

  it('should not have i18n when not set', () => {
    const config = ModalBuilder.form()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .build();

    expect(config.i18n).toBeUndefined();
  });

  describe('Form i18n integration', () => {
    let component: MnFormBodyComponent;
    let fixture: ComponentFixture<MnFormBodyComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MnFormBodyComponent, HttpClientTestingModule],
      }).compileComponents();
    });

    it('should use default labels when no i18n is set', () => {
      const config = ModalBuilder.form()
        .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
        .build();

      fixture = TestBed.createComponent(MnFormBodyComponent);
      component = fixture.componentInstance;
      component.config = config as FormModalConfig<unknown, unknown>;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      expect(component.labels.submit).toBe('Submit');
      expect(component.labels.cancel).toBe('Cancel');
      expect(component.labels.submitting).toBe('Submitting...');
      expect(component.labels.selectPlaceholder).toBe('Select...');
      expect(component.labels.loading).toBe('Loading...');
      expect(component.labels.fileUploadPrompt).toBe('Click or drag files here');
    });

    it('should use custom i18n labels when set', () => {
      const config = ModalBuilder.form()
        .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
        .i18n({
          submit: 'Enviar',
          cancel: 'Cancelar',
          submitting: 'Enviando...',
          selectPlaceholder: 'Seleccionar...',
          loading: 'Cargando...',
          fileUploadPrompt: 'Haga clic o arrastre archivos aquí',
        })
        .build();

      fixture = TestBed.createComponent(MnFormBodyComponent);
      component = fixture.componentInstance;
      component.config = config as FormModalConfig<unknown, unknown>;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      expect(component.labels.submit).toBe('Enviar');
      expect(component.labels.cancel).toBe('Cancelar');
      expect(component.labels.submitting).toBe('Enviando...');
      expect(component.labels.selectPlaceholder).toBe('Seleccionar...');
      expect(component.labels.loading).toBe('Cargando...');
      expect(component.labels.fileUploadPrompt).toBe('Haga clic o arrastre archivos aquí');
    });

    it('should render custom submit/cancel labels in DOM', () => {
      const config = ModalBuilder.form()
        .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
        .i18n({ submit: 'Senden', cancel: 'Abbrechen' })
        .build();

      fixture = TestBed.createComponent(MnFormBodyComponent);
      component = fixture.componentInstance;
      component.config = config as FormModalConfig<unknown, unknown>;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const buttons = el.querySelectorAll('button');
      const buttonTexts = Array.from(buttons).map(b => b.textContent?.trim());
      expect(buttonTexts).toContain('Senden');
      expect(buttonTexts).toContain('Abbrechen');
    });
  });

  describe('Wizard i18n integration', () => {
    let component: MnWizardBodyComponent;
    let fixture: ComponentFixture<MnWizardBodyComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MnWizardBodyComponent, HttpClientTestingModule],
      }).compileComponents();
    });

    it('should use default wizard labels when no i18n is set', () => {
      const config = ModalBuilder.wizard()
        .addStep('S1', (s) => s.body(''))
        .build();

      fixture = TestBed.createComponent(MnWizardBodyComponent);
      component = fixture.componentInstance;
      component.config = config as WizardModalConfig;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      expect(component.labels.next).toBe('Next');
      expect(component.labels.back).toBe('Back');
      expect(component.labels.close).toBe('Close');
      expect(component.labels.complete).toBe('Complete');
      expect(component.labels.completing).toBe('Completing...');
    });

    it('should use custom wizard i18n labels', () => {
      const config = ModalBuilder.wizard()
        .addStep('S1', (s) => s.body(''))
        .i18n({ next: 'Volgende', back: 'Terug', close: 'Sluiten', complete: 'Voltooien', completing: 'Bezig...' })
        .build();

      fixture = TestBed.createComponent(MnWizardBodyComponent);
      component = fixture.componentInstance;
      component.config = config as WizardModalConfig;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      expect(component.labels.next).toBe('Volgende');
      expect(component.labels.back).toBe('Terug');
      expect(component.labels.close).toBe('Sluiten');
      expect(component.labels.complete).toBe('Voltooien');
      expect(component.labels.completing).toBe('Bezig...');
    });

    it('should render custom wizard labels in DOM', () => {
      const config = ModalBuilder.wizard()
        .addStep('S1', (s) => s.body('A'))
        .addStep('S2', (s) => s.body('B'))
        .i18n({ next: 'Weiter', back: 'Zurück' })
        .build();

      fixture = TestBed.createComponent(MnWizardBodyComponent);
      component = fixture.componentInstance;
      component.config = config as WizardModalConfig;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const buttons = el.querySelectorAll('button');
      const buttonTexts = Array.from(buttons).map(b => b.textContent?.trim());
      expect(buttonTexts).toContain('Weiter');
    });
  });
});

// =============================================================
// Feature 12: Single-Select Table
// =============================================================
describe('Feature 12: Single-Select Table', () => {
  it('should have SINGLE_SELECT_TABLE in FieldKind enum', () => {
    expect(FieldKind.SINGLE_SELECT_TABLE).toBe('single-select-table');
  });

  it('should include SINGLE_SELECT_TABLE in form builder config', () => {
    type Model = { selectedUser: string; }
    const mockDs = createTestDataSource();
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.SINGLE_SELECT_TABLE,
        key: 'selectedUser',
        label: 'Select User',
        tableDataSource: mockDs as unknown as TableDataSource<unknown>,
      })
      .build();

    expect(config.fields[0].kind).toBe(FieldKind.SINGLE_SELECT_TABLE);
  });

  describe('Component integration', () => {
    let component: MnFormBodyComponent;
    let fixture: ComponentFixture<MnFormBodyComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MnFormBodyComponent, HttpClientTestingModule],
      }).compileComponents();
    });

    it('should create form control for SINGLE_SELECT_TABLE field', () => {
      type Model = { selectedUser: string; }
      const mockDs = createTestDataSource();
      const config = ModalBuilder.form<Model>()
        .field({
          kind: FieldKind.SINGLE_SELECT_TABLE,
          key: 'selectedUser',
          label: 'Select User',
          tableDataSource: mockDs,
        })
        .build();

      fixture = TestBed.createComponent(MnFormBodyComponent);
      component = fixture.componentInstance;
      component.config = config as FormModalConfig<unknown, unknown>;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      expect(component.form.contains('selectedUser')).toBeTrue();
    });

    it('should force single selection mode on table data source', () => {
      type Model = { selectedUser: string; }
      const mockDs = createTestDataSource();
      const config = ModalBuilder.form<Model>()
        .field({
          kind: FieldKind.SINGLE_SELECT_TABLE,
          key: 'selectedUser',
          label: 'Select User',
          tableDataSource: mockDs,
        })
        .build();

      fixture = TestBed.createComponent(MnFormBodyComponent);
      component = fixture.componentInstance;
      component.config = config as FormModalConfig<unknown, unknown>;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      expect(component.tableDataSources['selectedUser'].selectionMode).toBe('single');
    });

    it('should set single value (not array) on selection change', () => {
      type Model = { selectedUser: string; }
      const mockDs = createTestDataSource();
      const config = ModalBuilder.form<Model>()
        .field({
          kind: FieldKind.SINGLE_SELECT_TABLE,
          key: 'selectedUser',
          label: 'Select User',
          tableDataSource: mockDs,
        })
        .build();

      fixture = TestBed.createComponent(MnFormBodyComponent);
      component = fixture.componentInstance;
      component.config = config as FormModalConfig<unknown, unknown>;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      component.onTableSelectionChange(config.fields[0], [{ id: 'user-1', name: 'Alice' }]);
      expect(component.form.get('selectedUser')!.value).toBe('user-1');
    });

    it('should set null when no row is selected', () => {
      type Model = { selectedUser: string; }
      const mockDs = createTestDataSource();
      const config = ModalBuilder.form<Model>()
        .field({
          kind: FieldKind.SINGLE_SELECT_TABLE,
          key: 'selectedUser',
          label: 'Select User',
          tableDataSource: mockDs,
        })
        .build();

      fixture = TestBed.createComponent(MnFormBodyComponent);
      component = fixture.componentInstance;
      component.config = config as FormModalConfig<unknown, unknown>;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      component.onTableSelectionChange(config.fields[0], []);
      expect(component.form.get('selectedUser')!.value).toBeNull();
    });

    it('should use custom getRowValue for single select table', () => {
      type Model = { selectedEmail: string; }
      const mockDs = createTestDataSource();
      const config = ModalBuilder.form<Model>()
        .field({
          kind: FieldKind.SINGLE_SELECT_TABLE,
          key: 'selectedEmail',
          label: 'Select User',
          tableDataSource: mockDs,
          getRowValue: (row: unknown) => (row as TestRow).email,
        })
        .build();

      fixture = TestBed.createComponent(MnFormBodyComponent);
      component = fixture.componentInstance;
      component.config = config as FormModalConfig<unknown, unknown>;
      component.modalRef = createMockModalRef();
      fixture.detectChanges();

      component.onTableSelectionChange(config.fields[0], [{ id: '1', email: 'alice@test.com' }]);
      expect(component.form.get('selectedEmail')!.value).toBe('alice@test.com');
    });
  });
});

// =============================================================
// Feature 13: Color Picker / Rating / Slider Fields
// =============================================================
describe('Feature 13: Color Picker / Rating / Slider Fields', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: FormModalConfig<unknown, unknown>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = createMockModalRef();
    fixture.detectChanges();
  }

  // --- Color Picker ---
  describe('Color Picker', () => {
    it('should have COLOR in FieldKind enum', () => {
      expect(FieldKind.COLOR).toBe('color');
    });

    it('should create form control for COLOR field', () => {
      type Model = { color: string; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.COLOR, key: 'color', label: 'Color' })
        .build();
      setup(config);
      expect(component.form.contains('color')).toBeTrue();
    });

    it('should return default color value #000000', () => {
      type Model = { color: string; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.COLOR, key: 'color', label: 'Color' })
        .build();
      setup(config);
      expect(component.getColorValue(config.fields[0])).toBe('#000000');
    });

    it('should update color via onColorChange', () => {
      type Model = { color: string; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.COLOR, key: 'color', label: 'Color' })
        .build();
      setup(config);

      const mockEvent = {target: {value: '#ff5500'}} as unknown as Event;
      component.onColorChange(config.fields[0], mockEvent);
      expect(component.form.get('color')!.value).toBe('#ff5500');
    });

    it('should set color from swatch', () => {
      type Model = { color: string; }
      const config = ModalBuilder.form<Model>()
        .field({
          kind: FieldKind.COLOR, key: 'color', label: 'Color',
          swatches: ['#ff0000', '#00ff00', '#0000ff'],
        })
        .build();
      setup(config);

      component.setColorFromSwatch(config.fields[0], '#00ff00');
      expect(component.form.get('color')!.value).toBe('#00ff00');
    });

    it('should preserve swatches in config', () => {
      type Model = { color: string; }
      const swatches = ['#ff0000', '#00ff00', '#0000ff'];
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.COLOR, key: 'color', label: 'Color', swatches })
        .build();

      expect((config.fields[0] as ColorFieldConfig).swatches).toEqual(swatches);
    });

    it('should render color input in DOM', () => {
      type Model = { color: string; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.COLOR, key: 'color', label: 'Pick Color' })
        .build();
      setup(config);

      const el = fixture.nativeElement as HTMLElement;
      const colorInput = el.querySelector('input[type="color"]');
      expect(colorInput).toBeTruthy();
    });
  });

  // --- Rating ---
  describe('Rating', () => {
    it('should have RATING in FieldKind enum', () => {
      expect(FieldKind.RATING).toBe('rating');
    });

    it('should create form control for RATING field', () => {
      type Model = { rating: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.RATING, key: 'rating', label: 'Rating' })
        .build();
      setup(config);
      expect(component.form.contains('rating')).toBeTrue();
    });

    it('should return default rating range of 5', () => {
      type Model = { rating: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.RATING, key: 'rating', label: 'Rating' })
        .build();
      setup(config);
      expect(component.getRatingRange(config.fields[0])).toEqual([1, 2, 3, 4, 5]);
    });

    it('should return custom rating range', () => {
      type Model = { rating: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.RATING, key: 'rating', label: 'Rating', max: 10 })
        .build();
      setup(config);
      expect(component.getRatingRange(config.fields[0]).length).toBe(10);
    });

    it('should set rating value', () => {
      type Model = { rating: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.RATING, key: 'rating', label: 'Rating' })
        .build();
      setup(config);

      component.setRating(config.fields[0], 4);
      expect(component.form.get('rating')!.value).toBe(4);
      expect(component.getRatingValue(config.fields[0])).toBe(4);
    });

    it('should render star buttons in DOM', () => {
      type Model = { rating: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.RATING, key: 'rating', label: 'Rating', max: 5 })
        .build();
      setup(config);

      const el = fixture.nativeElement as HTMLElement;
      // Stars are rendered as buttons with ★ character
      const starButtons = el.querySelectorAll('button');
      // Filter out footer buttons (Cancel/Submit)
      const ratingButtons = Array.from(starButtons).filter(b => b.textContent?.includes('★'));
      expect(ratingButtons.length).toBe(5);
    });

    it('should preserve icon and allowHalf in config', () => {
      type Model = { rating: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.RATING, key: 'rating', label: 'Rating', icon: 'heart', allowHalf: true })
        .build();

      const field = config.fields[0] as RatingFieldConfig;
      expect(field.icon).toBe('heart');
      expect(field.allowHalf).toBeTrue();
    });
  });

  // --- Slider ---
  describe('Slider', () => {
    it('should have SLIDER in FieldKind enum', () => {
      expect(FieldKind.SLIDER).toBe('slider');
    });

    it('should create form control for SLIDER field', () => {
      type Model = { volume: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.SLIDER, key: 'volume', label: 'Volume' })
        .build();
      setup(config);
      expect(component.form.contains('volume')).toBeTrue();
    });

    it('should return default slider value (min or 0)', () => {
      type Model = { volume: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.SLIDER, key: 'volume', label: 'Volume' })
        .build();
      setup(config);
      expect(component.getSliderValue(config.fields[0])).toBe(0);
    });

    it('should return custom min as default slider value', () => {
      type Model = { volume: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.SLIDER, key: 'volume', label: 'Volume', min: 10 })
        .build();
      setup(config);
      expect(component.getSliderValue(config.fields[0])).toBe(10);
    });

    it('should update slider value via onSliderChange', () => {
      type Model = { volume: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.SLIDER, key: 'volume', label: 'Volume' })
        .build();
      setup(config);

      const mockEvent = {target: {value: '75'}} as unknown as Event;
      component.onSliderChange(config.fields[0], mockEvent);
      expect(component.form.get('volume')!.value).toBe(75);
    });

    it('should render range input in DOM', () => {
      type Model = { volume: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.SLIDER, key: 'volume', label: 'Volume' })
        .build();
      setup(config);

      const el = fixture.nativeElement as HTMLElement;
      const rangeInput = el.querySelector('input[type="range"]');
      expect(rangeInput).toBeTruthy();
    });

    it('should preserve unit and showValue in config', () => {
      type Model = { volume: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.SLIDER, key: 'volume', label: 'Volume', unit: '%', showValue: true, min: 0, max: 100, step: 5 })
        .build();

      const field = config.fields[0] as SliderFieldConfig;
      expect(field.unit).toBe('%');
      expect(field.showValue).toBeTrue();
      expect(field.min).toBe(0);
      expect(field.max).toBe(100);
      expect(field.step).toBe(5);
    });

    it('should use initial value for slider', () => {
      type Model = { volume: number; }
      const config = ModalBuilder.form<Model>()
        .field({ kind: FieldKind.SLIDER, key: 'volume', label: 'Volume' })
        .initialValue({ volume: 50 })
        .build();
      setup(config);
      expect(component.getSliderValue(config.fields[0])).toBe(50);
    });
  });
});

// =============================================================
// Feature 11: Select field i18n placeholder (raw select still used)
// =============================================================
describe('Feature 11: Select Field i18n Integration', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  it('should use custom selectPlaceholder from i18n in select field', () => {
    type Model = { role: string; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.SELECT, key: 'role', label: 'Role',
        options: [{ label: 'Admin', value: 'admin' }],
      })
      .i18n({ selectPlaceholder: 'Kies...' })
      .build();

    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    component.config = config as FormModalConfig<unknown, unknown>;
    component.modalRef = createMockModalRef();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const placeholderOption = el.querySelector('option[disabled]');
    expect(placeholderOption?.textContent?.trim()).toContain('Kies...');
  });

  it('should use default Select... placeholder when no i18n', () => {
    type Model = { role: string; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.SELECT, key: 'role', label: 'Role',
        options: [{ label: 'Admin', value: 'admin' }],
      })
      .build();

    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    component.config = config as FormModalConfig<unknown, unknown>;
    component.modalRef = createMockModalRef();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const placeholderOption = el.querySelector('option[disabled]');
    expect(placeholderOption?.textContent?.trim()).toContain('Select...');
  });
});


