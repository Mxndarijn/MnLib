import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {Validators} from '@angular/forms';
import {
  FieldKind,
  FormFieldConfig,
  FormFieldGroup,
  FormModalConfig,
  MnFormBodyComponent,
  MnModalRef,
  ModalKind
} from '../..';
import {HttpClientTestingModule} from '@angular/common/http/testing';

function createMockModalRef(): MnModalRef<unknown> {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: { subscribe: () => {} },
  } as unknown as MnModalRef<unknown>;
}

function createFormConfig(
  fields: FormFieldConfig<Record<string, unknown>>[],
  initialValue?: Partial<Record<string, unknown>>,
): FormModalConfig<Record<string, unknown>, Record<string, unknown>> {
  return {
    kind: ModalKind.FORM,
    fields,
    initialValue,
  } as FormModalConfig<Record<string, unknown>, Record<string, unknown>>;
}

describe('MnFormBodyComponent', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;
  let mockModalRef: MnModalRef<unknown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: FormModalConfig<Record<string, unknown>, Record<string, unknown>>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config as unknown as FormModalConfig<unknown>;
    component.modalRef = mockModalRef;
    fixture.detectChanges();
  }

  it('should create FormGroup with controls for each field', () => {
    setup(createFormConfig([
      { kind: FieldKind.TEXT, key: 'name', label: 'Name' },
      { kind: FieldKind.NUMBER, key: 'age', label: 'Age' },
    ]));
    expect(component.form).toBeTruthy();
    expect(component.form.contains('name')).toBeTrue();
    expect(component.form.contains('age')).toBeTrue();
  });

  it('should apply validators from field config', () => {
    setup(createFormConfig([
      { kind: FieldKind.TEXT, key: 'email', label: 'Email', validators: [Validators.required, Validators.email] },
    ]));
    expect(component.form.get('email')!.valid).toBeFalse();
    component.form.get('email')!.setValue('test@example.com');
    expect(component.form.get('email')!.valid).toBeTrue();
  });

  it('should be invalid when required fields are empty', () => {
    setup(createFormConfig([
      { kind: FieldKind.TEXT, key: 'name', label: 'Name', validators: [Validators.required] },
    ]));
    expect(component.form.invalid).toBeTrue();
  });

  it('should be valid when required fields are filled', () => {
    setup(createFormConfig([
      { kind: FieldKind.TEXT, key: 'name', label: 'Name', validators: [Validators.required] },
    ]));
    component.form.get('name')!.setValue('John');
    expect(component.form.valid).toBeTrue();
  });

  it('should apply initial values', () => {
    setup(createFormConfig(
      [{ kind: FieldKind.TEXT, key: 'name', label: 'Name' }],
      { name: 'Jane' },
    ));
    expect(component.form.get('name')!.value).toBe('Jane');
  });

  it('submit() should not call onComplete when form is invalid', async () => {
    const handler = { handle: jasmine.createSpy('handle') };
    const config = createFormConfig([
      { kind: FieldKind.TEXT, key: 'name', label: 'Name', validators: [Validators.required] },
    ]);
    config.onComplete = handler;
    setup(config);

    await component.submit();

    expect(handler.handle).not.toHaveBeenCalled();
    expect(mockModalRef.close).not.toHaveBeenCalled();
  });

  it('submit() should mark all fields as touched when invalid', async () => {
    setup(createFormConfig([
      { kind: FieldKind.TEXT, key: 'name', label: 'Name', validators: [Validators.required] },
    ]));

    await component.submit();

    expect(component.form.get('name')!.touched).toBeTrue();
  });

  it('submit() should call onComplete and close when form is valid', async () => {
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = createFormConfig([
      { kind: FieldKind.TEXT, key: 'name', label: 'Name', validators: [Validators.required] },
    ]);
    config.onComplete = handler;
    setup(config);

    component.form.get('name')!.setValue('John');
    await component.submit();

    expect(handler.handle).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'John' }));
    expect(mockModalRef.close).toHaveBeenCalled();
  });

  it('should build rows from config.rows when provided', () => {
    const config: FormModalConfig<Record<string, unknown>, Record<string, unknown>> = {
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.TEXT, key: 'a', label: 'A' },
        { kind: FieldKind.TEXT, key: 'b', label: 'B' },
      ],
      rows: [
        { columns: 2, fields: [
          { field: { kind: FieldKind.TEXT, key: 'a', label: 'A' }, span: 1 },
          { field: { kind: FieldKind.TEXT, key: 'b', label: 'B' }, span: 1 },
        ]},
      ],
    };
    setup(config);
    expect(component.rows.length).toBe(1);
    expect(component.rows[0].columns).toBe(2);
  });

  it('should fallback to one row per field when no rows provided', () => {
    setup(createFormConfig([
      { kind: FieldKind.TEXT, key: 'a', label: 'A' },
      { kind: FieldKind.TEXT, key: 'b', label: 'B' },
    ]));
    expect(component.rows.length).toBe(2);
  });

  it('should include top-level fields even when fieldGroups are present', () => {
    const config: FormModalConfig<Record<string, unknown>, Record<string, unknown>> = {
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.TEXT, key: 'topField', label: 'Top' },
        { kind: FieldKind.TEXT, key: 'groupField', label: 'In Group' },
      ],
      fieldGroups: [
        {
          title: 'Group 1',
          rows: [
            { columns: 1, fields: [{ field: { kind: FieldKind.TEXT, key: 'groupField', label: 'In Group' }, span: 1 }] }
          ],
          fields: []
        } as FormFieldGroup<Record<string, unknown>>
      ]
    };
    setup(config);
    expect(component.fieldGroups.length).toBe(1);
    expect(component.rows.length).toBe(1);
    expect(component.rows[0].fields[0].field.key).toBe('topField');

    // Verify DOM rendering
    const debugElement = fixture.debugElement;
    const groupElement = debugElement.nativeElement.querySelector('h3');
    expect(groupElement.textContent).toContain('Group 1');

    const inputFields = debugElement.nativeElement.querySelectorAll('mn-lib-input-field');
    // One in group, one standalone
    expect(inputFields.length).toBe(2);
  });

  it('should initialize form controls with updateOn option', () => {
    setup({
      kind: ModalKind.FORM,
      fields: [
        {
          kind: FieldKind.TEXT,
          key: 'name',
          label: 'Name',
          updateOn: 'blur',
          validators: [Validators.required]
        }
      ]
    } as FormModalConfig<Record<string, unknown>, Record<string, unknown>>);

    const control = component.form.get('name');
    expect(control?.updateOn).toBe('blur');
  });

  it('should apply autoFocus to the correct field', fakeAsync(() => {
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.TEXT, key: 'field1', label: 'Field 1' },
        { kind: FieldKind.TEXT, key: 'field2', label: 'Field 2', autoFocus: true }
      ]
    } as FormModalConfig<Record<string, unknown>, Record<string, unknown>>);

    tick(150); // increased tick to ensure AfterViewInit setTimeout and internal applyAutoFocus setTimeout finish
    fixture.detectChanges();

    const inputFields = component.inputFields?.toArray();
    expect(inputFields?.length).toBe(2);

    const spy = spyOn(inputFields![1], 'focus');

    // Re-trigger autoFocus logic
    component.applyAutoFocus();
    tick(100);

    expect(spy).toHaveBeenCalled();
  }));

  it('should disable all controls when config.disabled is true', () => {
    setup({
      kind: ModalKind.FORM,
      disabled: true,
      fields: [
        { kind: FieldKind.TEXT, key: 'name', label: 'Name' }
      ]
    } as FormModalConfig<Record<string, unknown>, Record<string, unknown>>);

    expect(component.form.disabled).toBeTrue();
    expect(component.form.get('name')?.disabled).toBeTrue();
  });

  it('should treat all fields as readOnly when config.readOnly is true', () => {
    setup({
      kind: ModalKind.FORM,
      readOnly: true,
      fields: [
        { kind: FieldKind.TEXT, key: 'name', label: 'Name' }
      ]
    } as FormModalConfig<Record<string, unknown>, Record<string, unknown>>);

    expect(component.isFieldReadOnly(component.config.fields[0])).toBeTrue();
    // form should also be disabled by default if readOnly is true in ngOnInit
    expect(component.form.disabled).toBeTrue();
  });
});
