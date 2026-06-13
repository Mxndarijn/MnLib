import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ModalBuilder } from '../builder/modal.builder';
import { MnFormBodyComponent } from '../components/mn-form-body/mn-form-body.component';
import {MnModalRef} from '../mn-modal-ref';
import {
  FieldKind,
  FormModalConfig,
} from '../mn-modal.types';

function createMockModalRef(): MnModalRef<unknown> {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: { subscribe: () => {} },
  } as unknown as MnModalRef<unknown>;
}

type TestModel = {
  type: string;
  name: string;
  address: string;
  city: string;
  companyName: string;
  vatNumber: string;
  password: string;
  confirmPassword: string;
}

// =============================================================
// Dynamic Field Groups
// =============================================================
describe('Feature: Dynamic Field Groups', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;
  let mockModalRef: MnModalRef<unknown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: FormModalConfig<TestModel, TestModel>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config;
    component.modalRef = mockModalRef;
    fixture.detectChanges();
  }

  it('should show all groups by default when no visible condition', () => {
    const config = ModalBuilder.form<TestModel>()
      .fieldGroup({
        title: 'Personal',
        fields: [{ kind: FieldKind.TEXT, key: 'name', label: 'Name' }],
      })
      .fieldGroup({
        title: 'Address',
        fields: [{ kind: FieldKind.TEXT, key: 'address', label: 'Address' }],
      })
      .build();

    setup(config);

    expect(component.isGroupVisible(component.fieldGroups[0])).toBeTrue();
    expect(component.isGroupVisible(component.fieldGroups[1])).toBeTrue();
  });

  it('should hide group when visible condition returns false', () => {
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.SELECT, key: 'type', label: 'Type', options: [
        { label: 'Personal', value: 'personal' },
        { label: 'Business', value: 'business' },
      ]})
      .fieldGroup({
        title: 'Business Info',
        visible: (form) => form.type === 'business',
        fields: [
          { kind: FieldKind.TEXT, key: 'companyName', label: 'Company', validators: [Validators.required] },
          { kind: FieldKind.TEXT, key: 'vatNumber', label: 'VAT', validators: [Validators.required] },
        ],
      })
      .build();

    setup(config);

    // Initially hidden (type is null)
    expect(component.isGroupVisible(component.fieldGroups[0])).toBeFalse();
  });

  it('should show group when condition becomes true', () => {
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.SELECT, key: 'type', label: 'Type', options: [
        { label: 'Personal', value: 'personal' },
        { label: 'Business', value: 'business' },
      ]})
      .fieldGroup({
        title: 'Business Info',
        visible: (form) => form.type === 'business',
        fields: [
          { kind: FieldKind.TEXT, key: 'companyName', label: 'Company', validators: [Validators.required] },
        ],
      })
      .build();

    setup(config);

    expect(component.isGroupVisible(component.fieldGroups[0])).toBeFalse();

    component.form.get('type')!.setValue('business');
    expect(component.isGroupVisible(component.fieldGroups[0])).toBeTrue();
  });

  it('should clear validators on hidden group fields', () => {
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.SELECT, key: 'type', label: 'Type', options: [
        { label: 'Personal', value: 'personal' },
        { label: 'Business', value: 'business' },
      ]})
      .fieldGroup({
        title: 'Business Info',
        visible: (form) => form.type === 'business',
        fields: [
          { kind: FieldKind.TEXT, key: 'companyName', label: 'Company', validators: [Validators.required] },
        ],
      })
      .build();

    setup(config);

    // Group is hidden, so companyName should not block form validity
    const companyControl = component.form.get('companyName')!;
    expect(companyControl.valid).toBeTrue(); // validators cleared
  });

  it('should restore validators when group becomes visible', () => {
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.SELECT, key: 'type', label: 'Type', options: [
        { label: 'Personal', value: 'personal' },
        { label: 'Business', value: 'business' },
      ]})
      .fieldGroup({
        title: 'Business Info',
        visible: (form) => form.type === 'business',
        fields: [
          { kind: FieldKind.TEXT, key: 'companyName', label: 'Company', validators: [Validators.required] },
        ],
      })
      .build();

    setup(config);

    // Make group visible
    component.form.get('type')!.setValue('business');

    // Validators should be restored — companyName is empty so invalid
    const companyControl = component.form.get('companyName')!;
    expect(companyControl.valid).toBeFalse();
  });

  it('should preserve visible condition in builder output', () => {
    const visibleFn = (form: Partial<TestModel>) => form.type === 'business';
    const config = ModalBuilder.form<TestModel>()
      .fieldGroup({
        title: 'Business',
        visible: visibleFn,
        fields: [{ kind: FieldKind.TEXT, key: 'companyName', label: 'Company' }],
      })
      .build();

    expect(config.fieldGroups![0].visible).toBe(visibleFn);
  });
});

// =============================================================
// FormGroup-Level Validators
// =============================================================
describe('Feature: FormGroup-Level Validators', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;
  let mockModalRef: MnModalRef<unknown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: FormModalConfig<TestModel, TestModel>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config;
    component.modalRef = mockModalRef;
    fixture.detectChanges();
  }

  function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirm = control.get('confirmPassword');
    if (password && confirm && password.value !== confirm.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  it('should apply groupValidators to the FormGroup', () => {
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.PASSWORD, key: 'password', label: 'Password' })
      .field({ kind: FieldKind.PASSWORD, key: 'confirmPassword', label: 'Confirm' })
      .groupValidators([passwordMatchValidator])
      .build();

    setup(config);

    component.form.get('password')!.setValue('abc123');
    component.form.get('confirmPassword')!.setValue('different');

    expect(component.form.hasError('passwordMismatch')).toBeTrue();
  });

  it('should be valid when groupValidator passes', () => {
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.PASSWORD, key: 'password', label: 'Password' })
      .field({ kind: FieldKind.PASSWORD, key: 'confirmPassword', label: 'Confirm' })
      .groupValidators([passwordMatchValidator])
      .build();

    setup(config);

    component.form.get('password')!.setValue('abc123');
    component.form.get('confirmPassword')!.setValue('abc123');

    expect(component.form.hasError('passwordMismatch')).toBeFalse();
  });

  it('should block submit when groupValidator fails', async () => {
    const handler = { handle: jasmine.createSpy('handle') };
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.PASSWORD, key: 'password', label: 'Password' })
      .field({ kind: FieldKind.PASSWORD, key: 'confirmPassword', label: 'Confirm' })
      .groupValidators([passwordMatchValidator])
      .onComplete(handler)
      .build();

    setup(config);

    component.form.get('password')!.setValue('abc');
    component.form.get('confirmPassword')!.setValue('xyz');

    await component.submit();

    expect(handler.handle).not.toHaveBeenCalled();
    expect(mockModalRef.close).not.toHaveBeenCalled();
  });

  it('should allow submit when groupValidator passes', async () => {
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.PASSWORD, key: 'password', label: 'Password' })
      .field({ kind: FieldKind.PASSWORD, key: 'confirmPassword', label: 'Confirm' })
      .groupValidators([passwordMatchValidator])
      .onComplete(handler)
      .build();

    setup(config);

    component.form.get('password')!.setValue('abc');
    component.form.get('confirmPassword')!.setValue('abc');

    await component.submit();

    expect(handler.handle).toHaveBeenCalled();
    expect(mockModalRef.close).toHaveBeenCalled();
  });

  it('should preserve groupValidators in builder output', () => {
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .groupValidators([passwordMatchValidator])
      .build();

    expect(config.groupValidators).toBeDefined();
    expect(config.groupValidators!.length).toBe(1);
  });

  it('should work without groupValidators (no errors)', () => {
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .build();

    setup(config);

    expect(component.form.errors).toBeNull();
  });

  it('should support multiple groupValidators', () => {
    const v1 = (control: AbstractControl): ValidationErrors | null => {
      return control.get('name')?.value ? null : { nameRequired: true };
    };
    const v2 = (control: AbstractControl): ValidationErrors | null => {
      return control.get('city')?.value ? null : { cityRequired: true };
    };

    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .field({ kind: FieldKind.TEXT, key: 'city', label: 'City' })
      .groupValidators([v1, v2])
      .build();

    setup(config);

    expect(component.form.hasError('nameRequired')).toBeTrue();
    expect(component.form.hasError('cityRequired')).toBeTrue();

    component.form.get('name')!.setValue('John');
    component.form.get('city')!.setValue('Amsterdam');

    expect(component.form.errors).toBeNull();
  });
});
