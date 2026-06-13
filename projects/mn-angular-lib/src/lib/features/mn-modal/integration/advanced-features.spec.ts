import {ComponentFixture, TestBed} from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ModalBuilder } from '../builder/modal.builder';
import { MnFormBodyComponent } from '../components/mn-form-body/mn-form-body.component';
import {MnModalRef} from '../mn-modal-ref';
import {
  FieldKind,
  SelectOption,
  FieldDataSource,
  FormModalConfig,
  FormValidator,
  ModalRef,
  SelectFieldConfig,
  TextFieldConfig,
} from '../mn-modal.types';

function createMockModalRef(): ModalRef<unknown> {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    update: jasmine.createSpy('update'),
    afterClosed$: { subscribe: () => {} },
  } as unknown as ModalRef<unknown>;
}

// =============================================================
// Feature 1: Conditional / Dynamic Fields
// =============================================================
describe('Feature: Conditional/Dynamic Fields', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;
  let mockModalRef: ModalRef<unknown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup<TModel>(config: Readonly<FormModalConfig<TModel>>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config as unknown as FormModalConfig;
    component.modalRef = mockModalRef as unknown as MnModalRef;
    fixture.detectChanges();
  }

  it('should hide a field when visible condition returns false', () => {
    type Model = { role: string; permissions: string[]; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.SELECT, key: 'role', label: 'Role', options: [
        { label: 'User', value: 'user' }, { label: 'Admin', value: 'admin' },
      ]})
      .field({
        kind: FieldKind.TEXT, key: 'permissions', label: 'Permissions',
        visible: (form) => form.role === 'admin',
      })
      .build();

    setup(config);

    // Initially role is null, so permissions should be hidden
    expect(component.isFieldVisible(config.fields[1])).toBeFalse();
  });

  it('should show a field when visible condition returns true', () => {
    type Model = { role: string; permissions: string; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.SELECT, key: 'role', label: 'Role', options: [
        { label: 'User', value: 'user' }, { label: 'Admin', value: 'admin' },
      ]})
      .field({
        kind: FieldKind.TEXT, key: 'permissions', label: 'Permissions',
        visible: (form) => form.role === 'admin',
      })
      .initialValue({ role: 'admin' })
      .build();

    setup(config);

    expect(component.isFieldVisible(config.fields[1])).toBeTrue();
  });

  it('should toggle visibility when dependent field changes', () => {
    type Model = { role: string; extra: string; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.SELECT, key: 'role', label: 'Role', options: [
        { label: 'User', value: 'user' }, { label: 'Admin', value: 'admin' },
      ]})
      .field({
        kind: FieldKind.TEXT, key: 'extra', label: 'Extra',
        visible: (form) => form.role === 'admin',
      })
      .build();

    setup(config);

    expect(component.isFieldVisible(config.fields[1])).toBeFalse();

    // Change role to admin
    component.form.get('role')!.setValue('admin');
    expect(component.isFieldVisible(config.fields[1])).toBeTrue();

    // Change role back
    component.form.get('role')!.setValue('user');
    expect(component.isFieldVisible(config.fields[1])).toBeFalse();
  });

  it('should clear validators on hidden fields so they do not block submit', () => {
    type Model = { role: string; extra: string; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.SELECT, key: 'role', label: 'Role', options: [
        { label: 'User', value: 'user' }, { label: 'Admin', value: 'admin' },
      ]})
      .field({
        kind: FieldKind.TEXT, key: 'extra', label: 'Extra',
        validators: [Validators.required],
        visible: (form) => form.role === 'admin',
      })
      .build();

    setup(config);

    // extra is hidden, its validators should be cleared
    const extraControl = component.form.get('extra')!;
    expect(extraControl.valid).toBeTrue(); // no validators active
  });

  it('should restore validators when field becomes visible again', () => {
    type Model = { role: string; extra: string; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.SELECT, key: 'role', label: 'Role', options: [
        { label: 'User', value: 'user' }, { label: 'Admin', value: 'admin' },
      ]})
      .field({
        kind: FieldKind.TEXT, key: 'extra', label: 'Extra',
        validators: [Validators.required],
        visible: (form) => form.role === 'admin',
      })
      .build();

    setup(config);

    // Make visible
    component.form.get('role')!.setValue('admin');
    const extraControl = component.form.get('extra')!;
    expect(extraControl.valid).toBeFalse(); // required validator restored, value is null
  });

  it('should always show fields without a visible condition', () => {
    type Model = { name: string; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .build();

    setup(config);

    expect(component.isFieldVisible(config.fields[0])).toBeTrue();
  });
});

// =============================================================
// Feature 2: Cross-Field Validation
// =============================================================
describe('Feature: Cross-Field Validation', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;
  let mockModalRef: ModalRef<unknown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup<TModel>(config: Readonly<FormModalConfig<TModel>>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config as unknown as FormModalConfig;
    component.modalRef = mockModalRef as unknown as MnModalRef;
    fixture.detectChanges();
  }

  it('should detect cross-field errors when passwords do not match', () => {
    type Model = { password: string; confirmPassword: string; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'password', label: 'Password' })
      .field({ kind: FieldKind.TEXT, key: 'confirmPassword', label: 'Confirm' })
      .formValidators([
        (form) => {
          if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
            return { confirmPassword: 'Passwords do not match' };
          }
          return null;
        },
      ])
      .build();

    setup(config);

    component.form.get('password')!.setValue('abc123');
    component.form.get('confirmPassword')!.setValue('xyz789');

    expect(component.getFieldError('confirmPassword')).toBe('Passwords do not match');
    expect(component.hasFormErrors).toBeTrue();
  });

  it('should clear cross-field errors when values match', () => {
    type Model = { password: string; confirmPassword: string; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'password', label: 'Password' })
      .field({ kind: FieldKind.TEXT, key: 'confirmPassword', label: 'Confirm' })
      .formValidators([
        (form) => {
          if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
            return { confirmPassword: 'Passwords do not match' };
          }
          return null;
        },
      ])
      .build();

    setup(config);

    component.form.get('password')!.setValue('abc123');
    component.form.get('confirmPassword')!.setValue('abc123');

    expect(component.getFieldError('confirmPassword')).toBeNull();
    expect(component.hasFormErrors).toBeFalse();
  });

  it('should block submit when cross-field errors exist', async () => {
    type Model = { start: string; end: string; }
    const handler = { handle: jasmine.createSpy('handle') };
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'start', label: 'Start' })
      .field({ kind: FieldKind.TEXT, key: 'end', label: 'End' })
      .formValidators([
        (form) => {
          if (form.start && form.end && form.start > form.end) {
            return { end: 'End must be after start' };
          }
          return null;
        },
      ])
      .onComplete(handler)
      .build();

    setup(config);

    component.form.get('start')!.setValue('2026-12-31');
    component.form.get('end')!.setValue('2026-01-01');

    await component.submit();

    expect(handler.handle).not.toHaveBeenCalled();
    expect(mockModalRef.close).not.toHaveBeenCalled();
  });

  it('should allow submit when no cross-field errors', async () => {
    type Model = { a: string; b: string; }
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A', validators: [Validators.required] })
      .field({ kind: FieldKind.TEXT, key: 'b', label: 'B', validators: [Validators.required] })
      .formValidators([
        (form) => {
          if (form.a === form.b) return { b: 'Must be different' };
          return null;
        },
      ])
      .onComplete(handler)
      .build();

    setup(config);

    component.form.get('a')!.setValue('hello');
    component.form.get('b')!.setValue('world');

    await component.submit();

    expect(handler.handle).toHaveBeenCalled();
    expect(mockModalRef.close).toHaveBeenCalled();
  });

  it('should support form-level errors via _form key', () => {
    type Model = { a: string; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .formValidators([
        () => ({ _form: 'Something is wrong with the form' }),
      ])
      .build();

    setup(config);

    component.form.get('a')!.setValue('x'); // trigger valueChanges

    expect(component.formErrors['_form']).toBe('Something is wrong with the form');
  });

  it('should support multiple form validators', () => {
    type Model = { a: string; b: string; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .field({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .formValidators([
        (form) => form.a === 'bad' ? { a: 'A is bad' } : null,
        (form) => form.b === 'bad' ? { b: 'B is bad' } : null,
      ])
      .build();

    setup(config);

    component.form.get('a')!.setValue('bad');
    component.form.get('b')!.setValue('bad');

    expect(component.getFieldError('a')).toBe('A is bad');
    expect(component.getFieldError('b')).toBe('B is bad');
  });
});

// =============================================================
// Feature 3: Async Data Sources
// =============================================================
describe('Feature: Async Data Sources', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;
  let mockModalRef: ModalRef<unknown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup<TModel>(config: Readonly<FormModalConfig<TModel>>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config as unknown as FormModalConfig;
    component.modalRef = mockModalRef as unknown as MnModalRef;
    fixture.detectChanges();
  }

  it('should load options from a data source on init', async () => {
    type Model = { country: string; }
    const options: SelectOption<string>[] = [
      { label: 'NL', value: 'nl' },
      { label: 'DE', value: 'de' },
    ];
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.SELECT, key: 'country', label: 'Country',
        options: [],
        dataSource: { load: async () => options },
      })
      .build();

    setup(config);

    // Wait for async load
    await fixture.whenStable();

    expect(component.getFieldOptions(config.fields[0])).toEqual(options);
    expect(component.isFieldLoading('country')).toBeFalse();
  });

  it('should show loading state while data source is loading', () => {
    type Model = { country: string; }
    let resolveLoad!: (val: SelectOption<string>[]) => void;
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.SELECT, key: 'country', label: 'Country',
        options: [],
        dataSource: {
          load: () => new Promise<SelectOption<string>[]>(r => { resolveLoad = r; }),
        },
      })
      .build();

    setup(config);

    expect(component.isFieldLoading('country')).toBeTrue();

    // Resolve
    resolveLoad([{ label: 'NL', value: 'nl' }]);
  });

  it('should reload dependent data source when dependency changes', async () => {
    type Model = { country: string; city: string; }
    const loadSpy = jasmine.createSpy('load').and.callFake(async (formValue: Partial<Model>) => {
      if (formValue?.country === 'nl') return [{ label: 'Amsterdam', value: 'ams' }];
      return [];
    });

    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.SELECT, key: 'country', label: 'Country',
        options: [{ label: 'NL', value: 'nl' }, { label: 'DE', value: 'de' }],
      })
      .field({
        kind: FieldKind.SELECT, key: 'city', label: 'City',
        options: [],
        dataSource: { load: loadSpy, dependsOn: ['country'] },
      })
      .build();

    setup(config);
    await fixture.whenStable();

    // Initial load called once
    const initialCallCount = loadSpy.calls.count();

    // Change country
    component.form.get('country')!.setValue('nl');
    await fixture.whenStable();

    expect(loadSpy.calls.count()).toBeGreaterThan(initialCallCount);
    expect(component.getFieldOptions(config.fields[1])).toEqual([{ label: 'Amsterdam', value: 'ams' }]);
  });

  it('should not reload when non-dependent field changes', async () => {
    type Model = { name: string; country: string; city: string; }
    const loadSpy = jasmine.createSpy('load').and.returnValue(Promise.resolve([]));

    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .field({
        kind: FieldKind.SELECT, key: 'country', label: 'Country',
        options: [{ label: 'NL', value: 'nl' }],
      })
      .field({
        kind: FieldKind.SELECT, key: 'city', label: 'City',
        options: [],
        dataSource: { load: loadSpy, dependsOn: ['country'] },
      })
      .build();

    setup(config);
    await fixture.whenStable();

    const callCountAfterInit = loadSpy.calls.count();

    // Change name (not a dependency)
    component.form.get('name')!.setValue('John');
    await fixture.whenStable();

    expect(loadSpy.calls.count()).toBe(callCountAfterInit);
  });

  it('should handle data source errors gracefully', async () => {
    type Model = { country: string; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.SELECT, key: 'country', label: 'Country',
        options: [],
        dataSource: { load: () => Promise.reject(new Error('Network error')) },
      })
      .build();

    setup(config);
    await fixture.whenStable();

    expect(component.getFieldOptions(config.fields[0])).toEqual([]);
    expect(component.isFieldLoading('country')).toBeFalse();
  });

  it('should use static options when no data source is configured', () => {
    type Model = { role: string; }
    const staticOptions = [{ label: 'Admin', value: 'admin' }, { label: 'User', value: 'user' }];
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.SELECT, key: 'role', label: 'Role',
        options: staticOptions,
      })
      .build();

    setup(config);

    expect(component.getFieldOptions(config.fields[0])).toEqual(staticOptions);
  });

  it('should support synchronous data source load', async () => {
    type Model = { status: string; }
    const syncOptions: SelectOption<string>[] = [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ];
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.SELECT, key: 'status', label: 'Status',
        options: [],
        dataSource: { load: () => syncOptions },
      })
      .build();

    setup(config);
    await fixture.whenStable();

    expect(component.getFieldOptions(config.fields[0])).toEqual(syncOptions);
  });
});

// =============================================================
// Builder: formValidators in config
// =============================================================
describe('FormModalBuilder: formValidators', () => {
  it('should include formValidators in built config', () => {
    type Model = { a: string; }
    const validator: FormValidator<Model> = (form) => form.a === 'x' ? { a: 'err' } : null;
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .formValidators([validator])
      .build();

    expect(config.formValidators).toBeDefined();
    expect(config.formValidators!.length).toBe(1);
    expect(config.formValidators![0]({ a: 'x' })).toEqual({ a: 'err' });
    expect(config.formValidators![0]({ a: 'y' })).toBeNull();
  });

  it('should not have formValidators when not set', () => {
    type Model = { a: string; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .build();

    expect(config.formValidators).toBeUndefined();
  });
});

// =============================================================
// Builder: visible and dataSource in field configs
// =============================================================
describe('FormModalBuilder: visible and dataSource in config', () => {
  it('should preserve visible condition in built config', () => {
    type Model = { role: string; extra: string; }
    const visibleFn = (form: Partial<Model>) => form.role === 'admin';
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.TEXT, key: 'role', label: 'Role' })
      .field({ kind: FieldKind.TEXT, key: 'extra', label: 'Extra', visible: visibleFn })
      .build();

    expect((config.fields[1] as TextFieldConfig<Model>).visible).toBe(visibleFn);
  });

  it('should preserve dataSource in built config', () => {
    type Model = { country: string; }
    const ds: FieldDataSource<string, Model> = {
      load: async () => [{ label: 'NL', value: 'nl' }],
      dependsOn: ['country'],
    };
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.SELECT, key: 'country', label: 'Country',
        options: [], dataSource: ds,
      })
      .build();

    expect((config.fields[0] as SelectFieldConfig<Model>).dataSource).toBe(ds);
  });
});
