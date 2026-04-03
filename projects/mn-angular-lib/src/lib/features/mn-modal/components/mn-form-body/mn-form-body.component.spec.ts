import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { MnFormBodyComponent } from './mn-form-body.component';
import { MnModalRef } from '../../mn-modal-ref';
import { FieldKind, FormModalConfig, ModalKind, ModalCloseReason } from '../../mn-modal.types';
import { HttpClientTestingModule } from '@angular/common/http/testing';

function createMockModalRef(): any {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: { subscribe: () => {} },
  };
}

function createFormConfig(fields: any[], initialValue?: any): FormModalConfig<any, any> {
  return {
    kind: ModalKind.FORM,
    fields,
    initialValue,
  } as FormModalConfig<any, any>;
}

describe('MnFormBodyComponent', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;
  let mockModalRef: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: FormModalConfig<any, any>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config;
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
    const config: FormModalConfig<any, any> = {
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
});
