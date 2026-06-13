import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {AbstractControl, AsyncValidatorFn, ValidationErrors, Validators} from '@angular/forms';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {map, Observable, of, timer} from 'rxjs';
import {ModalBuilder} from '../builder';
import {
  FieldKind,
  FileFieldConfig,
  FormModalConfig,
  MnFormBodyComponent,
  MnModalRef,
  MnWizardBodyComponent,
  ModalStepId,
  TextFieldConfig,
  WizardBeforeCompleteValidator,
  WizardFlowMode,
  WizardModalConfig,
  WizardResult,
} from '..';

function createMockModalRef(): MnModalRef {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: {
      subscribe: () => {
      }
    } as unknown as MnModalRef['afterClosed$'],
    update: jasmine.createSpy('update'),
  } as unknown as MnModalRef;
}

// =============================================================
// Feature 1: Field-Level Async Validators
// =============================================================
describe('Feature 1: Field-Level Async Validators', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;
  let mockModalRef: MnModalRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup<TModel, TResult = TModel>(config: Readonly<FormModalConfig<TModel, TResult>>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config as unknown as FormModalConfig<unknown>;
    component.modalRef = mockModalRef;
    fixture.detectChanges();
  }

  function usernameAsyncValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) return of(null);
      const taken = control.value === 'taken';
      return timer(10).pipe(map(() => taken ? { usernameTaken: true } : null));
    };
  }

  it('should register async validators on form controls', () => {
    type Model = { username: string; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.TEXT,
        key: 'username',
        label: 'Username',
        asyncValidators: [usernameAsyncValidator()],
      })
      .build();

    setup(config);

    const control = component.form.get('username')!;
    expect(control.asyncValidator).toBeTruthy();
  });

  it('should mark control as PENDING while async validator runs', fakeAsync(() => {
    type Model = { username: string; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.TEXT,
        key: 'username',
        label: 'Username',
        asyncValidators: [usernameAsyncValidator()],
      })
      .build();

    setup(config);

    const control = component.form.get('username')!;
    control.setValue('taken');

    expect(control.status).toBe('PENDING');

    tick(20);

    expect(control.status).toBe('INVALID');
    expect(control.errors).toEqual({ usernameTaken: true });
  }));

  it('should validate as VALID when async validator passes', fakeAsync(() => {
    type Model = { username: string; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.TEXT,
        key: 'username',
        label: 'Username',
        asyncValidators: [usernameAsyncValidator()],
      })
      .build();

    setup(config);

    const control = component.form.get('username')!;
    control.setValue('available');
    tick(20);

    expect(control.status).toBe('VALID');
    expect(control.errors).toBeNull();
  }));

  it('should combine sync and async validators', fakeAsync(() => {
    type Model = { username: string; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.TEXT,
        key: 'username',
        label: 'Username',
        validators: [Validators.required, Validators.minLength(3)],
        asyncValidators: [usernameAsyncValidator()],
      })
      .build();

    setup(config);

    const control = component.form.get('username')!;

    // Sync validator fails first (empty)
    control.setValue('');
    tick(20);
    expect(control.hasError('required')).toBeTrue();

    // Sync validator fails (too short)
    control.setValue('ab');
    tick(20);
    expect(control.hasError('minlength')).toBeTrue();

    // Sync passes, async fails
    control.setValue('taken');
    tick(20);
    expect(control.hasError('usernameTaken')).toBeTrue();

    // Both pass
    control.setValue('available');
    tick(20);
    expect(control.valid).toBeTrue();
  }));

  it('should block form submit when async validator marks field invalid', fakeAsync(() => {
    type Model = { username: string; }
    const handler = { handle: jasmine.createSpy('handle') };
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.TEXT,
        key: 'username',
        label: 'Username',
        asyncValidators: [usernameAsyncValidator()],
      })
      .onComplete(handler)
      .build();

    setup(config);

    component.form.get('username')!.setValue('taken');
    tick(20); // let async validator complete — marks INVALID

    component.submit();
    tick(0);

    expect(component.form.get('username')!.status).toBe('INVALID');
    expect(handler.handle).not.toHaveBeenCalled();
  }));

  it('should support async validators on multiple field types', fakeAsync(() => {
    type Model = { email: string; code: number; }
    const asyncVal: AsyncValidatorFn = (ctrl) =>
      timer(10).pipe(map(() => ctrl.value === 'bad' || ctrl.value === 99 ? { invalid: true } : null));

    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.TEXT,
        key: 'email',
        label: 'Email',
        asyncValidators: [asyncVal],
      })
      .field({
        kind: FieldKind.NUMBER,
        key: 'code',
        label: 'Code',
        asyncValidators: [asyncVal],
      })
      .build();

    setup(config);

    component.form.get('email')!.setValue('bad');
    component.form.get('code')!.setValue(99);
    tick(20);

    expect(component.form.get('email')!.hasError('invalid')).toBeTrue();
    expect(component.form.get('code')!.hasError('invalid')).toBeTrue();
  }));
});

// =============================================================
// Feature 2: Cross-Step Validation in Wizard (onBeforeComplete)
// =============================================================
describe('Feature 2: Cross-Step Validation (onBeforeComplete)', () => {
  let component: MnWizardBodyComponent;
  let fixture: ComponentFixture<MnWizardBodyComponent>;
  let mockModalRef: MnModalRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnWizardBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: WizardModalConfig) {
    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config;
    component.modalRef = mockModalRef as unknown as MnModalRef<WizardResult>;
    fixture.detectChanges();
  }

  it('should block completion when onBeforeComplete returns errors', async () => {
    const validator: WizardBeforeCompleteValidator = async () => ({
      dateRange: 'End date must be after start date',
    });

    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('Start'))
      .onBeforeComplete([validator])
      .build();

    setup(config);

    await component.complete();

    expect(mockModalRef.close).not.toHaveBeenCalled();
    expect(component.wizardErrors['dateRange']).toBe('End date must be after start date');
    expect(component.isCompleting).toBeFalse();
  });

  it('should allow completion when onBeforeComplete returns null', async () => {
    const validator: WizardBeforeCompleteValidator = async () => null;
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };

    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('OK'))
      .onBeforeComplete([validator])
      .onComplete(handler)
      .build();

    setup(config);

    await component.complete();

    expect(handler.handle).toHaveBeenCalled();
    expect(mockModalRef.close).toHaveBeenCalled();
  });

  it('should run multiple onBeforeComplete validators and aggregate errors', async () => {
    const v1: WizardBeforeCompleteValidator = async () => ({ err1: 'Error 1' });
    const v2: WizardBeforeCompleteValidator = async () => ({ err2: 'Error 2' });

    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('X'))
      .onBeforeComplete([v1, v2])
      .build();

    setup(config);

    await component.complete();

    expect(component.wizardErrors['err1']).toBe('Error 1');
    expect(component.wizardErrors['err2']).toBe('Error 2');
    expect(mockModalRef.close).not.toHaveBeenCalled();
  });

  it('should pass aggregated payload to onBeforeComplete validators', async () => {
    const validatorSpy = jasmine.createSpy('validator').and.returnValue(Promise.resolve(null));
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };

    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => {
        s.field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' });
      }, 'step1')
      .onBeforeComplete([validatorSpy])
      .onComplete(handler)
      .build();

    setup(config);

    await component.complete();

    expect(validatorSpy).toHaveBeenCalledWith(jasmine.any(Object));
  });

  it('should store onBeforeComplete in builder config', () => {
    const v: WizardBeforeCompleteValidator = async () => null;
    const config = ModalBuilder.wizard()
      .addStep('S', (s) => s.body(''))
      .onBeforeComplete([v])
      .build();

    expect(config.onBeforeComplete).toBeDefined();
    expect(config.onBeforeComplete!.length).toBe(1);
  });
});

// =============================================================
// Feature 3: Dynamic Step Visibility in Wizard
// =============================================================
describe('Feature 3: Dynamic Step Visibility in Wizard', () => {
  let component: MnWizardBodyComponent;
  let fixture: ComponentFixture<MnWizardBodyComponent>;
  let mockModalRef: MnModalRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnWizardBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: WizardModalConfig) {
    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config;
    component.modalRef = mockModalRef as unknown as MnModalRef<WizardResult>;
    fixture.detectChanges();
  }

  it('should filter out hidden steps from visibleSteps', () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Hidden', (s) => {
        s.body('B').visible(() => false);
      })
      .addStep('Step 3', (s) => s.body('C'))
      .build();

    setup(config);

    expect(component.visibleSteps.length).toBe(2);
    expect(component.visibleSteps[0].title).toBe('Step 1');
    expect(component.visibleSteps[1].title).toBe('Step 3');
  });

  it('should skip hidden steps during navigation', async () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Hidden', (s) => {
        s.body('B').visible(() => false);
      })
      .addStep('Step 3', (s) => s.body('C'))
      .build();

    setup(config);

    await component.next();

    // Should skip 'Hidden' and go to Step 3
    expect(component.currentStepId).toBe('step-2');
  });

  it('should treat step as last when subsequent steps are hidden', () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Hidden', (s) => {
        s.body('B').visible(() => false);
      })
      .build();

    setup(config);

    // Step 1 is the only visible step, so it's the last
    expect(component.isLastStep).toBeTrue();
  });

  it('should show all steps when no visible condition is set', () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Step 2', (s) => s.body('B'))
      .build();

    setup(config);

    expect(component.visibleSteps.length).toBe(2);
  });

  it('should support visible condition on StepBuilder', () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Conditional', (s) => {
        s.body('B').visible((data) => data['step-0']?.['plan'] === 'premium');
      })
      .build();

    expect(config.steps[1].visible).toBeDefined();
  });

  it('isStepVisible should return true when no visible condition', () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('A'))
      .build();

    setup(config);

    expect(component.isStepVisible(config.steps[0])).toBeTrue();
  });
});

// =============================================================
// Feature 4: WizardFlowMode.FREE
// =============================================================
describe('Feature 4: WizardFlowMode.FREE', () => {
  let component: MnWizardBodyComponent;
  let fixture: ComponentFixture<MnWizardBodyComponent>;
  let mockModalRef: MnModalRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnWizardBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: WizardModalConfig) {
    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config;
    component.modalRef = mockModalRef as unknown as MnModalRef<WizardResult>;
    fixture.detectChanges();
  }

  it('should report isFreeFlow as true when flow is FREE', () => {
    const config = ModalBuilder.wizard()
      .flow(WizardFlowMode.FREE)
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Step 2', (s) => s.body('B'))
      .build();

    setup(config);

    expect(component.isFreeFlow).toBeTrue();
  });

  it('should report isFreeFlow as false when flow is LINEAR', () => {
    const config = ModalBuilder.wizard()
      .flow(WizardFlowMode.LINEAR)
      .addStep('Step 1', (s) => s.body('A'))
      .build();

    setup(config);

    expect(component.isFreeFlow).toBeFalse();
  });

  it('should allow direct navigation to any visible step in FREE mode', async () => {
    const config = ModalBuilder.wizard()
      .flow(WizardFlowMode.FREE)
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Step 2', (s) => s.body('B'))
      .addStep('Step 3', (s) => s.body('C'))
      .build();

    setup(config);

    expect(component.currentStepId).toBe('step-0');

    // Jump directly to step 3
    await component.goToStep(config.steps[2]);
    expect(component.currentStepId).toBe('step-2');

    // Jump back to step 1
    await component.goToStep(config.steps[0]);
    expect(component.currentStepId).toBe('step-0');
  });

  it('should not allow direct navigation in LINEAR mode', async () => {
    const config = ModalBuilder.wizard()
      .flow(WizardFlowMode.LINEAR)
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Step 2', (s) => s.body('B'))
      .build();

    setup(config);

    expect(component.canNavigateToStep(config.steps[1])).toBeFalse();

    await component.goToStep(config.steps[1]);
    expect(component.currentStepId).toBe('step-0'); // didn't move
  });

  it('should track visited steps on direct navigation', async () => {
    const config = ModalBuilder.wizard()
      .flow(WizardFlowMode.FREE)
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Step 2', (s) => s.body('B'))
      .addStep('Step 3', (s) => s.body('C'))
      .build();

    setup(config);

    await component.goToStep(config.steps[2]);
    expect(component.visitedStepIds).toContain('step-2');
  });

  it('should fire onStepChange with DIRECT direction on goToStep', async () => {
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = ModalBuilder.wizard()
      .flow(WizardFlowMode.FREE)
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Step 2', (s) => s.body('B'))
      .onStepChange(handler)
      .build();

    setup(config);

    await component.goToStep(config.steps[1]);

    expect(handler.handle).toHaveBeenCalledWith(jasmine.objectContaining({
      previousStepId: 'step-0',
      currentStepId: 'step-1',
      direction: 'direct',
    }));
  });

  it('should not navigate to hidden steps in FREE mode', async () => {
    const config = ModalBuilder.wizard()
      .flow(WizardFlowMode.FREE)
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Hidden', (s) => {
        s.body('B').visible(() => false);
      })
      .build();

    setup(config);

    expect(component.canNavigateToStep(config.steps[1])).toBeFalse();
  });

  it('should not navigate to the same step', async () => {
    const handler = { handle: jasmine.createSpy('handle') };
    const config = ModalBuilder.wizard()
      .flow(WizardFlowMode.FREE)
      .addStep('Step 1', (s) => s.body('A'))
      .onStepChange(handler)
      .build();

    setup(config);

    await component.goToStep(config.steps[0]);
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('should render clickable step indicators in FREE mode', () => {
    const config = ModalBuilder.wizard()
      .flow(WizardFlowMode.FREE)
      .addStep('Step 1', (s) => s.body('A'))
      .addStep('Step 2', (s) => s.body('B'))
      .build();

    setup(config);
    fixture.detectChanges();

    const stepIndicators = fixture.nativeElement.querySelectorAll('.flex-col.items-center.gap-1');
    expect(stepIndicators.length).toBe(2);
    // In FREE mode, indicators should have cursor-pointer class
    expect(stepIndicators[1].classList.contains('cursor-pointer')).toBeTrue();
  });
});

// =============================================================
// Feature 5: File Upload Fields
// =============================================================
describe('Feature 5: File Upload Fields', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;
  let mockModalRef: MnModalRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup<TModel, TResult = TModel>(config: Readonly<FormModalConfig<TModel, TResult>>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = config as unknown as FormModalConfig<unknown>;
    component.modalRef = mockModalRef;
    fixture.detectChanges();
  }

  function createMockFile(name: string, size: number, type = 'text/plain'): File {
    const content = new Array(size).fill('a').join('');
    return new File([content], name, { type });
  }

  it('should create a form control for FILE field', () => {
    type Model = { doc: File[]; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.FILE,
        key: 'doc',
        label: 'Document',
      })
      .build();

    setup(config);

    expect(component.form.contains('doc')).toBeTrue();
  });

  it('should handle file selection via onFileChange', () => {
    type Model = { doc: File[]; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.FILE,
        key: 'doc',
        label: 'Document',
      })
      .build();

    setup(config);

    const file = createMockFile('test.pdf', 100);
    const event = {target: {files: [file], value: ''}} as unknown as Event;
    component.onFileChange(config.fields[0], event);

    expect(component.getSelectedFiles('doc').length).toBe(1);
    expect(component.getSelectedFiles('doc')[0].name).toBe('test.pdf');
  });

  it('should filter out oversized files when maxSize is set', () => {
    type Model = { doc: File[]; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.FILE,
        key: 'doc',
        label: 'Document',
        maxSize: 50,
      })
      .build();

    setup(config);

    const bigFile = createMockFile('big.pdf', 100);
    const smallFile = createMockFile('small.pdf', 30);
    const event = {target: {files: [bigFile, smallFile], value: ''}} as unknown as Event;
    component.onFileChange(config.fields[0], event);

    expect(component.getSelectedFiles('doc').length).toBe(1);
    expect(component.getSelectedFiles('doc')[0].name).toBe('small.pdf');
  });

  it('should enforce maxFiles limit', () => {
    type Model = { docs: File[]; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.FILE,
        key: 'docs',
        label: 'Documents',
        multiple: true,
        maxFiles: 2,
      })
      .build();

    setup(config);

    const files = [
      createMockFile('a.pdf', 10),
      createMockFile('b.pdf', 10),
      createMockFile('c.pdf', 10),
    ];
    const event = {target: {files, value: ''}} as unknown as Event;
    component.onFileChange(config.fields[0], event);

    expect(component.getSelectedFiles('docs').length).toBe(2);
  });

  it('should remove a file by index', () => {
    type Model = { doc: File[]; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.FILE,
        key: 'doc',
        label: 'Document',
        multiple: true,
      })
      .build();

    setup(config);

    const files = [createMockFile('a.pdf', 10), createMockFile('b.pdf', 10)];
    const event = {target: {files, value: ''}} as unknown as Event;
    component.onFileChange(config.fields[0], event);

    expect(component.getSelectedFiles('doc').length).toBe(2);

    component.removeFile('doc', 0);
    expect(component.getSelectedFiles('doc').length).toBe(1);
    expect(component.getSelectedFiles('doc')[0].name).toBe('b.pdf');
  });

  it('should set form control value to null when all files removed', () => {
    type Model = { doc: File[]; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.FILE,
        key: 'doc',
        label: 'Document',
      })
      .build();

    setup(config);

    const file = createMockFile('test.pdf', 10);
    const event = {target: {files: [file], value: ''}} as unknown as Event;
    component.onFileChange(config.fields[0], event);

    component.removeFile('doc', 0);
    expect(component.form.get('doc')!.value).toBeNull();
  });

  it('should format file sizes correctly', () => {
    type Model = { doc: File[]; }
    const config = ModalBuilder.form<Model>()
      .field({ kind: FieldKind.FILE, key: 'doc', label: 'Doc' })
      .build();

    setup(config);

    expect(component.formatFileSize(500)).toBe('500 B');
    expect(component.formatFileSize(1024)).toBe('1.0 KB');
    expect(component.formatFileSize(1048576)).toBe('1.0 MB');
  });

  it('should render file upload drop zone in template', () => {
    type Model = { doc: File[]; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.FILE,
        key: 'doc',
        label: 'Document',
        accept: '.pdf,.jpg',
      })
      .build();

    setup(config);
    fixture.detectChanges();

    const dropZone = fixture.nativeElement.querySelector('input[type="file"]');
    expect(dropZone).toBeTruthy();
    expect(dropZone.getAttribute('accept')).toBe('.pdf,.jpg');
  });

  it('should support required validation on file fields', async () => {
    type Model = { doc: File[]; }
    const handler = { handle: jasmine.createSpy('handle') };
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.FILE,
        key: 'doc',
        label: 'Document',
        validators: [Validators.required],
      })
      .onComplete(handler)
      .build();

    setup(config);

    await component.submit();

    expect(handler.handle).not.toHaveBeenCalled();
    expect(component.form.get('doc')!.touched).toBeTrue();
  });

  it('FieldKind.FILE should exist in enum', () => {
    expect(FieldKind.FILE).toBe('file');
  });

  it('should keep only one file when multiple is not set', () => {
    type Model = { avatar: File[]; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.FILE,
        key: 'avatar',
        label: 'Avatar',
        // multiple not set = single file
      })
      .build();

    setup(config);

    const files = [createMockFile('a.jpg', 10), createMockFile('b.jpg', 10)];
    const event = {target: {files, value: ''}} as unknown as Event;
    component.onFileChange(config.fields[0], event);

    expect(component.getSelectedFiles('avatar').length).toBe(1);
  });
});

// =============================================================
// Additional coverage: Builder tests for new features
// =============================================================
describe('Builder: asyncValidators in field config', () => {
  it('should preserve asyncValidators in built form config', () => {
    type Model = { email: string; }
    const asyncVal = (_ctrl: AbstractControl) => of(null);
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.TEXT,
        key: 'email',
        label: 'Email',
        asyncValidators: [asyncVal],
      })
      .build();

    expect((config.fields[0] as TextFieldConfig<{ email: string }>).asyncValidators).toBeDefined();
    expect((config.fields[0] as TextFieldConfig<{ email: string }>).asyncValidators!.length).toBe(1);
  });

  it('should preserve asyncValidators in step builder field config', () => {
    const asyncVal = (_ctrl: AbstractControl) => of(null);
    const config = ModalBuilder.wizard()
      .addStep('Step', (s) => {
        s.field({
          kind: FieldKind.TEXT,
          key: 'email',
          label: 'Email',
          asyncValidators: [asyncVal],
        });
      })
      .build();

    expect((config.steps[0].fields![0] as TextFieldConfig).asyncValidators!.length).toBe(1);
  });
});

describe('Builder: FileFieldConfig', () => {
  it('should preserve file field config properties', () => {
    type Model = { doc: File[]; }
    const config = ModalBuilder.form<Model>()
      .field({
        kind: FieldKind.FILE,
        key: 'doc',
        label: 'Document',
        accept: '.pdf',
        multiple: true,
        maxSize: 5000000,
        maxFiles: 3,
      })
      .build();

    const field = config.fields[0] as FileFieldConfig<{ doc: File[] }>;
    expect(field.kind).toBe(FieldKind.FILE);
    expect(field.accept).toBe('.pdf');
    expect(field.multiple).toBeTrue();
    expect(field.maxSize).toBe(5000000);
    expect(field.maxFiles).toBe(3);
  });

  it('should support file field in step builder', () => {
    const config = ModalBuilder.wizard()
      .addStep('Upload', (s) => {
        s.field({
          kind: FieldKind.FILE,
          key: 'attachment',
          label: 'Attachment',
          accept: '.pdf,.doc',
        });
      })
      .build();

    expect(config.steps[0].fields![0].kind).toBe(FieldKind.FILE);
  });
});

describe('Wizard: step visible condition in builder', () => {
  it('should set visible condition via StepBuilder.visible()', () => {
    const condition = (data: Record<ModalStepId, Record<string, unknown>>) => (data['step-0'] as Record<string, unknown>)?.['plan'] === 'premium';
    const config = ModalBuilder.wizard()
      .addStep('Plan', (s) => s.body('Choose'))
      .addStep('Premium Features', (s) => {
        s.body('Extra').visible(condition);
      })
      .build();

    expect(config.steps[1].visible).toBe(condition);
  });

  it('should not have visible when not set', () => {
    const config = ModalBuilder.wizard()
      .addStep('Step', (s) => s.body('X'))
      .build();

    expect(config.steps[0].visible).toBeUndefined();
  });
});
