import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ModalBuilder } from '../builder/modal.builder';
import { MnFormBodyComponent } from '../components/mn-form-body/mn-form-body.component';
import { MnConfirmationBodyComponent } from '../components/mn-confirmation-body/mn-confirmation-body.component';
import { MnWizardBodyComponent } from '../components/mn-wizard-body/mn-wizard-body.component';
import {
  FieldKind,
  ModalSize,
  ModalKind,
  ConfirmationTone,
  ActionStyle,
  ModalCloseReason,
  WizardFlowMode,
  FormLayoutMode,
  ValidationStatus,
} from '../mn-modal.types';

function createMockModalRef(): any {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: { subscribe: () => {} },
  };
}

interface TestUser {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
}

// =============================================================
// Integration: FormModalBuilder → MnFormBodyComponent
// =============================================================
describe('Integration: FormModalBuilder → MnFormBodyComponent', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;
  let mockModalRef: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: any) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config;
    component.modalRef = mockModalRef;
    fixture.detectChanges();
  }

  it('should create form controls from builder config', () => {
    const config = ModalBuilder.form<TestUser>()
      .title('User Form')
      .field({ kind: FieldKind.TEXT, key: 'firstName', label: 'First Name' })
      .field({ kind: FieldKind.TEXT, key: 'lastName', label: 'Last Name' })
      .field({ kind: FieldKind.TEXT, key: 'email', label: 'Email' })
      .build();

    setup(config);

    expect(component.form.contains('firstName')).toBeTrue();
    expect(component.form.contains('lastName')).toBeTrue();
    expect(component.form.contains('email')).toBeTrue();
  });

  it('should apply validators from builder config', () => {
    const config = ModalBuilder.form<TestUser>()
      .field({
        kind: FieldKind.TEXT,
        key: 'email',
        label: 'Email',
        validators: [Validators.required, Validators.email],
      })
      .build();

    setup(config);

    expect(component.form.get('email')!.valid).toBeFalse();
    component.form.get('email')!.setValue('bad');
    expect(component.form.get('email')!.valid).toBeFalse();
    component.form.get('email')!.setValue('test@example.com');
    expect(component.form.get('email')!.valid).toBeTrue();
  });

  it('should apply initial values from builder config', () => {
    const config = ModalBuilder.form<TestUser>()
      .field({ kind: FieldKind.TEXT, key: 'firstName', label: 'First Name' })
      .field({ kind: FieldKind.TEXT, key: 'lastName', label: 'Last Name' })
      .initialValue({ firstName: 'John', lastName: 'Doe' })
      .build();

    setup(config);

    expect(component.form.get('firstName')!.value).toBe('John');
    expect(component.form.get('lastName')!.value).toBe('Doe');
  });

  it('should build rows from builder .row()/.addToRow() config', () => {
    const config = ModalBuilder.form<TestUser>()
      .row(2)
        .addToRow({ kind: FieldKind.TEXT, key: 'firstName', label: 'First Name' })
        .addToRow({ kind: FieldKind.TEXT, key: 'lastName', label: 'Last Name' })
      .field({ kind: FieldKind.TEXT, key: 'email', label: 'Email' })
      .build();

    setup(config);

    expect(component.rows.length).toBe(2);
    expect(component.rows[0].columns).toBe(2);
    expect(component.rows[0].fields.length).toBe(2);
    expect(component.rows[1].columns).toBe(1);
    expect(component.rows[1].fields.length).toBe(1);
  });

  it('should block submit when builder-configured required fields are empty', async () => {
    const handler = { handle: jasmine.createSpy('handle') };
    const config = ModalBuilder.form<TestUser>()
      .field({
        kind: FieldKind.TEXT,
        key: 'firstName',
        label: 'First Name',
        validators: [Validators.required],
      })
      .onComplete(handler)
      .build();

    setup(config);

    await component.submit();

    expect(handler.handle).not.toHaveBeenCalled();
    expect(mockModalRef.close).not.toHaveBeenCalled();
    expect(component.form.get('firstName')!.touched).toBeTrue();
  });

  it('should submit successfully when builder-configured form is valid', async () => {
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = ModalBuilder.form<TestUser>()
      .field({
        kind: FieldKind.TEXT,
        key: 'firstName',
        label: 'First Name',
        validators: [Validators.required],
      })
      .onComplete(handler)
      .build();

    setup(config);

    component.form.get('firstName')!.setValue('Jane');
    await component.submit();

    expect(handler.handle).toHaveBeenCalledWith(jasmine.objectContaining({ firstName: 'Jane' }));
    expect(mockModalRef.close).toHaveBeenCalled();
  });

  it('should handle number fields with min/max from builder', () => {
    const config = ModalBuilder.form<TestUser>()
      .field({
        kind: FieldKind.NUMBER,
        key: 'age',
        label: 'Age',
        min: 18,
        max: 120,
        validators: [Validators.required, Validators.min(18), Validators.max(120)],
      })
      .build();

    setup(config);

    component.form.get('age')!.setValue(10);
    expect(component.form.get('age')!.valid).toBeFalse();

    component.form.get('age')!.setValue(25);
    expect(component.form.get('age')!.valid).toBeTrue();
  });

  it('should preserve config kind and size from builder', () => {
    const config = ModalBuilder.form<TestUser>()
      .title('Test')
      .size(ModalSize.LG)
      .field({ kind: FieldKind.TEXT, key: 'firstName', label: 'First Name' })
      .build();

    expect(config.kind).toBe(ModalKind.FORM);
    expect(config.size).toBe(ModalSize.LG);
    expect(config.title).toBe('Test');

    setup(config);
    expect(component.form).toBeTruthy();
  });

  it('should handle select fields from builder config', () => {
    interface SelectModel { role: string; }
    const config = ModalBuilder.form<SelectModel>()
      .field({
        kind: FieldKind.SELECT,
        key: 'role',
        label: 'Role',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
        ],
        validators: [Validators.required],
      })
      .build();

    setup(config);

    expect(component.form.get('role')!.valid).toBeFalse();
    component.form.get('role')!.setValue('admin');
    expect(component.form.get('role')!.valid).toBeTrue();
  });

  it('should handle mixed row layouts from builder', () => {
    interface LayoutModel { a: string; b: string; c: string; d: string; }
    const config = ModalBuilder.form<LayoutModel>()
      .row(3)
        .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
        .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' }, 2)
      .row(2)
        .addToRow({ kind: FieldKind.TEXT, key: 'c', label: 'C' })
        .addToRow({ kind: FieldKind.TEXT, key: 'd', label: 'D' })
      .build();

    setup(config);

    expect(component.rows.length).toBe(2);
    expect(component.rows[0].columns).toBe(3);
    expect(component.rows[0].fields[1].span).toBe(2);
    expect(component.rows[1].columns).toBe(2);
  });
});

// =============================================================
// Integration: ConfirmationModalBuilder → MnConfirmationBodyComponent
// =============================================================
describe('Integration: ConfirmationModalBuilder → MnConfirmationBodyComponent', () => {
  let component: MnConfirmationBodyComponent<any>;
  let fixture: ComponentFixture<MnConfirmationBodyComponent<any>>;
  let mockModalRef: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnConfirmationBodyComponent],
    }).compileComponents();
  });

  function setup(config: any) {
    fixture = TestBed.createComponent(MnConfirmationBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config;
    component.modalRef = mockModalRef;
    fixture.detectChanges();
  }

  it('should display message from builder config', () => {
    const config = ModalBuilder.confirmation()
      .title('Delete?')
      .message('Are you sure you want to delete this?')
      .build();

    setup(config);

    expect(component.config.message).toBe('Are you sure you want to delete this?');
  });

  it('should apply tone from builder config', () => {
    const config = ModalBuilder.confirmation()
      .message('Danger!')
      .tone(ConfirmationTone.DANGER)
      .build();

    setup(config);

    expect(component.toneClass).toBe('tone-danger');
  });

  it('should apply confirm/cancel labels from builder config', () => {
    const config = ModalBuilder.confirmation()
      .message('Delete?')
      .confirmAction({ label: 'Yes, delete', style: ActionStyle.DANGER })
      .cancelAction({ label: 'Keep it', style: ActionStyle.SECONDARY })
      .build();

    setup(config);

    expect(component.confirmLabel).toBe('Yes, delete');
    expect(component.cancelLabel).toBe('Keep it');
  });

  it('should close with COMPLETED on confirm using builder config', async () => {
    const config = ModalBuilder.confirmation()
      .message('Proceed?')
      .confirmAction({ label: 'OK' })
      .build();

    setup(config);
    await component.confirm();

    expect(mockModalRef.close).toHaveBeenCalledWith(true);
  });

  it('should dismiss with CANCELLED on cancel using builder config', () => {
    const config = ModalBuilder.confirmation()
      .message('Proceed?')
      .cancelAction({ label: 'Cancel' })
      .build();

    setup(config);
    component.cancel();

    expect(mockModalRef.dismiss).toHaveBeenCalledWith(ModalCloseReason.CANCELLED);
  });

  it('should dismiss with custom reason from builder config', () => {
    const config = ModalBuilder.confirmation()
      .message('Proceed?')
      .cancelAction({ label: 'Dismiss', reason: ModalCloseReason.DISMISSED })
      .build();

    setup(config);
    component.cancel();

    expect(mockModalRef.dismiss).toHaveBeenCalledWith(ModalCloseReason.DISMISSED);
  });

  it('should invoke confirm handler from builder config', async () => {
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = ModalBuilder.confirmation()
      .message('Proceed?')
      .confirmAction({ label: 'OK', handler })
      .build();

    setup(config);
    await component.confirm();

    expect(handler.handle).toHaveBeenCalledWith(true);
    expect(mockModalRef.close).toHaveBeenCalled();
  });

  it('should map ActionStyle from builder to correct button colors', () => {
    const config = ModalBuilder.confirmation()
      .message('Test')
      .confirmAction({ label: 'Delete', style: ActionStyle.DANGER })
      .cancelAction({ label: 'Cancel', style: ActionStyle.GHOST })
      .build();

    setup(config);

    expect(component.getButtonColor(component.confirmStyle)).toBe('danger');
    expect(component.getButtonVariant(component.confirmStyle)).toBe('fill');
    expect(component.getButtonColor(component.cancelStyle)).toBe('secondary');
    expect(component.getButtonVariant(component.cancelStyle)).toBe('text');
  });
});

// =============================================================
// Integration: WizardModalBuilder → MnWizardBodyComponent
// =============================================================
describe('Integration: WizardModalBuilder → MnWizardBodyComponent', () => {
  let component: MnWizardBodyComponent;
  let fixture: ComponentFixture<MnWizardBodyComponent>;
  let mockModalRef: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnWizardBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: any) {
    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config;
    component.modalRef = mockModalRef;
    fixture.detectChanges();
  }

  it('should initialize with first step from builder config', () => {
    const config = ModalBuilder.wizard()
      .title('Wizard')
      .addStep('Step 1', (s) => s.body('Hello'))
      .addStep('Step 2', (s) => s.body('World'))
      .build();

    setup(config);

    expect(component.currentStepId).toBe('step-0');
    expect(component.currentStepIndex).toBe(0);
    expect(component.canGoBack).toBeFalse();
    expect(component.canGoNext).toBeTrue();
  });

  it('should initialize with startAt step from builder config', () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('A'), 'first')
      .addStep('Step 2', (s) => s.body('B'), 'second')
      .startAt('second')
      .build();

    setup(config);

    expect(component.currentStepId).toBe('second');
    expect(component.currentStepIndex).toBe(1);
  });

  it('should navigate forward on text-only steps', async () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('First'))
      .addStep('Step 2', (s) => s.body('Second'))
      .addStep('Step 3', (s) => s.body('Third'))
      .build();

    setup(config);

    expect(component.currentStepId).toBe('step-0');

    await component.next();
    expect(component.currentStepId).toBe('step-1');

    await component.next();
    expect(component.currentStepId).toBe('step-2');
    expect(component.isLastStep).toBeTrue();
  });

  it('should navigate backward', async () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('First'))
      .addStep('Step 2', (s) => s.body('Second'))
      .build();

    setup(config);

    await component.next();
    expect(component.currentStepId).toBe('step-1');

    await component.back();
    expect(component.currentStepId).toBe('step-0');
  });

  it('should dismiss modal when going back on first step', async () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('Only'))
      .build();

    setup(config);

    await component.back();
    expect(mockModalRef.dismiss).toHaveBeenCalledWith(ModalCloseReason.CANCELLED);
  });

  it('should track visited step IDs', async () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Step 2', (s) => s.body('B'))
      .addStep('Step 3', (s) => s.body('C'))
      .build();

    setup(config);

    expect(component.visitedStepIds).toEqual(['step-0']);

    await component.next();
    expect(component.visitedStepIds).toContain('step-1');

    await component.next();
    expect(component.visitedStepIds).toContain('step-2');
  });

  it('should call onComplete with wizard result on complete()', async () => {
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('Done'))
      .onComplete(handler)
      .build();

    setup(config);

    await component.complete();

    expect(handler.handle).toHaveBeenCalledWith(jasmine.objectContaining({
      status: ModalCloseReason.COMPLETED,
      visitedStepIds: ['step-0'],
    }));
    expect(mockModalRef.close).toHaveBeenCalled();
  });

  it('should call onStepChange handler during navigation', async () => {
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Step 2', (s) => s.body('B'))
      .onStepChange(handler)
      .build();

    setup(config);

    await component.next();

    expect(handler.handle).toHaveBeenCalledWith(jasmine.objectContaining({
      previousStepId: 'step-0',
      currentStepId: 'step-1',
      direction: 'forward',
    }));
  });

  it('should not advance past last step', async () => {
    const config = ModalBuilder.wizard()
      .addStep('Only', (s) => s.body('Single'))
      .build();

    setup(config);

    await component.next();
    expect(component.currentStepId).toBe('step-0');
  });

  it('should block next() when canExit guard returns false', async () => {
    const config = ModalBuilder.wizard()
      .addStep('Guarded', (s) => {
        s.body('Blocked')
         .guard({ canEnter: () => true, canExit: () => false });
      })
      .addStep('Target', (s) => s.body('Never'))
      .build();

    setup(config);

    await component.next();
    expect(component.currentStepId).toBe('step-0');
  });

  it('should block next() when canEnter guard on next step returns false', async () => {
    const config = ModalBuilder.wizard()
      .addStep('Start', (s) => s.body('Go'))
      .addStep('Blocked', (s) => {
        s.body('No entry')
         .guard({ canEnter: () => false, canExit: () => true });
      })
      .build();

    setup(config);

    await component.next();
    expect(component.currentStepId).toBe('step-0');
  });

  it('should block next() when step validator returns invalid', async () => {
    const config = ModalBuilder.wizard()
      .addStep('Validated', (s) => {
        s.body('Check')
         .validators([{ validate: () => ({ status: ValidationStatus.INVALID }) }]);
      })
      .addStep('Next', (s) => s.body('After'))
      .build();

    setup(config);

    await component.next();
    expect(component.currentStepId).toBe('step-0');
  });

  it('should allow next() when step validator returns valid', async () => {
    const config = ModalBuilder.wizard()
      .addStep('Validated', (s) => {
        s.body('Check')
         .validators([{ validate: () => ({ status: ValidationStatus.VALID }) }]);
      })
      .addStep('Next', (s) => s.body('After'))
      .build();

    setup(config);

    await component.next();
    expect(component.currentStepId).toBe('step-1');
  });

  it('should pre-build form configs for steps with fields', () => {
    const config = ModalBuilder.wizard()
      .addStep('Form Step', (s) => {
        s.field({ kind: FieldKind.TEXT, key: 'name', label: 'Name', validators: [Validators.required] });
      }, 'form-step')
      .addStep('Text Step', (s) => s.body('Just text'), 'text-step')
      .build();

    setup(config);

    expect(component.stepFormConfigs['form-step']).toBeTruthy();
    expect(component.stepFormConfigs['form-step'].fields.length).toBe(1);
    expect(component.stepFormConfigs['text-step']).toBeUndefined();
  });
});
