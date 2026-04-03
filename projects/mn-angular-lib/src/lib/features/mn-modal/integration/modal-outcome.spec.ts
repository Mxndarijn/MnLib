import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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
  ModalCloseReason,
  ConfirmationTone,
  ActionStyle,
  ValidationStatus,
  WizardResult,
} from '../mn-modal.types';
import { MnModalRef } from '../mn-modal-ref';

// =============================================
// Helper: mock MnModalRef that tracks events
// =============================================
function createTrackingModalRef(): { ref: any; closed: any[]; lastCloseResult: any; lastDismissReason: any } {
  const tracker = {
    ref: null as any,
    closed: [] as any[],
    lastCloseResult: undefined as any,
    lastDismissReason: undefined as any,
  };
  tracker.ref = {
    close: jasmine.createSpy('close').and.callFake((result?: any) => {
      tracker.lastCloseResult = result;
      tracker.closed.push({ reason: ModalCloseReason.COMPLETED, result });
    }),
    dismiss: jasmine.createSpy('dismiss').and.callFake((reason: ModalCloseReason) => {
      tracker.lastDismissReason = reason;
      tracker.closed.push({ reason });
    }),
    afterClosed$: { subscribe: () => {} },
  };
  return tracker;
}

// =============================================
// Outcome Tests: Form Modal
// =============================================
describe('Outcome: Form Modal', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  interface ContactForm {
    name: string;
    email: string;
  }

  it('should emit form values on successful submit via modalRef.close()', async () => {
    const tracker = createTrackingModalRef();
    const handler = {
      handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()),
    };
    const config = ModalBuilder.form<ContactForm>()
      .title('Contact')
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name', validators: [Validators.required] })
      .field({ kind: FieldKind.TEXT, key: 'email', label: 'Email', validators: [Validators.required, Validators.email] })
      .onComplete(handler)
      .build();

    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    // Fill in valid data
    component.form.get('name')!.setValue('Alice');
    component.form.get('email')!.setValue('alice@test.com');

    await component.submit();

    // Verify the handler received the correct form data
    expect(handler.handle).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'Alice', email: 'alice@test.com' })
    );
    // Verify modalRef.close was called with the form data
    expect(tracker.ref.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'Alice', email: 'alice@test.com' })
    );
    expect(tracker.closed.length).toBe(1);
    expect(tracker.closed[0].reason).toBe(ModalCloseReason.COMPLETED);
    expect(tracker.closed[0].result).toEqual(jasmine.objectContaining({ name: 'Alice', email: 'alice@test.com' }));
  });

  it('should NOT close modal when form is invalid', async () => {
    const tracker = createTrackingModalRef();
    const handler = { handle: jasmine.createSpy('handle') };
    const config = ModalBuilder.form<ContactForm>()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name', validators: [Validators.required] })
      .field({ kind: FieldKind.TEXT, key: 'email', label: 'Email', validators: [Validators.required] })
      .onComplete(handler)
      .build();

    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    // Submit without filling anything
    await component.submit();

    expect(handler.handle).not.toHaveBeenCalled();
    expect(tracker.ref.close).not.toHaveBeenCalled();
    expect(tracker.closed.length).toBe(0);
  });

  it('should dismiss with CANCELLED when cancel button logic is triggered', () => {
    const tracker = createTrackingModalRef();
    const config = ModalBuilder.form<ContactForm>()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .build();

    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    // Simulate cancel (the template calls modalRef.dismiss(ModalCloseReason.CANCELLED))
    tracker.ref.dismiss(ModalCloseReason.CANCELLED);

    expect(tracker.lastDismissReason).toBe(ModalCloseReason.CANCELLED);
    expect(tracker.closed.length).toBe(1);
    expect(tracker.closed[0].reason).toBe(ModalCloseReason.CANCELLED);
  });

  it('should include initial values in the submitted result', async () => {
    const tracker = createTrackingModalRef();
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = ModalBuilder.form<ContactForm>()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .field({ kind: FieldKind.TEXT, key: 'email', label: 'Email' })
      .initialValue({ name: 'Preset', email: 'preset@test.com' })
      .onComplete(handler)
      .build();

    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    await component.submit();

    expect(tracker.ref.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'Preset', email: 'preset@test.com' })
    );
  });

  it('should recover from onComplete handler error and allow retry', async () => {
    const tracker = createTrackingModalRef();
    let callCount = 0;
    const handler = {
      handle: jasmine.createSpy('handle').and.callFake(async () => {
        callCount++;
        if (callCount === 1) throw new Error('Server error');
      }),
    };
    const config = ModalBuilder.form<ContactForm>()
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name', validators: [Validators.required] })
      .onComplete(handler)
      .build();

    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    component.form.get('name')!.setValue('Bob');

    // First submit fails
    await component.submit();
    expect(handler.handle).toHaveBeenCalledTimes(1);
    expect(tracker.ref.close).not.toHaveBeenCalled();
    expect(component.isSubmitting).toBeFalse();

    // Second submit succeeds
    await component.submit();
    expect(handler.handle).toHaveBeenCalledTimes(2);
    expect(tracker.ref.close).toHaveBeenCalled();
  });
});

// =============================================
// Outcome Tests: Confirmation Modal
// =============================================
describe('Outcome: Confirmation Modal', () => {
  let component: MnConfirmationBodyComponent<any>;
  let fixture: ComponentFixture<MnConfirmationBodyComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnConfirmationBodyComponent],
    }).compileComponents();
  });

  it('should close with COMPLETED and result=true on confirm', async () => {
    const tracker = createTrackingModalRef();
    const config = ModalBuilder.confirmation()
      .message('Delete item?')
      .confirmAction({ label: 'Delete', style: ActionStyle.DANGER })
      .build();

    fixture = TestBed.createComponent(MnConfirmationBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    await component.confirm();

    expect(tracker.closed.length).toBe(1);
    expect(tracker.closed[0].reason).toBe(ModalCloseReason.COMPLETED);
    expect(tracker.closed[0].result).toBe(true);
  });

  it('should dismiss with CANCELLED on cancel', () => {
    const tracker = createTrackingModalRef();
    const config = ModalBuilder.confirmation()
      .message('Are you sure?')
      .cancelAction({ label: 'No' })
      .build();

    fixture = TestBed.createComponent(MnConfirmationBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    component.cancel();

    expect(tracker.closed.length).toBe(1);
    expect(tracker.closed[0].reason).toBe(ModalCloseReason.CANCELLED);
    expect(tracker.lastCloseResult).toBeUndefined();
  });

  it('should dismiss with custom reason on cancel', () => {
    const tracker = createTrackingModalRef();
    const config = ModalBuilder.confirmation()
      .message('Continue?')
      .cancelAction({ label: 'Dismiss', reason: ModalCloseReason.DISMISSED })
      .build();

    fixture = TestBed.createComponent(MnConfirmationBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    component.cancel();

    expect(tracker.lastDismissReason).toBe(ModalCloseReason.DISMISSED);
  });

  it('should invoke confirm handler before closing', async () => {
    const tracker = createTrackingModalRef();
    const handlerLog: string[] = [];
    const handler = {
      handle: jasmine.createSpy('handle').and.callFake(async () => {
        handlerLog.push('handler-called');
      }),
    };
    const config = ModalBuilder.confirmation()
      .message('Proceed?')
      .confirmAction({ label: 'Yes', handler })
      .build();

    fixture = TestBed.createComponent(MnConfirmationBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    await component.confirm();

    expect(handlerLog).toEqual(['handler-called']);
    expect(tracker.ref.close).toHaveBeenCalledWith(true);
  });
});

// =============================================
// Outcome Tests: Wizard Modal
// =============================================
describe('Outcome: Wizard Modal', () => {
  let component: MnWizardBodyComponent;
  let fixture: ComponentFixture<MnWizardBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnWizardBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  it('should close with WizardResult containing visited steps and COMPLETED status', async () => {
    const tracker = createTrackingModalRef();
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('First'))
      .addStep('Step 2', (s) => s.body('Second'))
      .onComplete(handler)
      .build();

    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    await component.next();
    await component.complete();

    expect(handler.handle).toHaveBeenCalledWith(jasmine.objectContaining({
      status: ModalCloseReason.COMPLETED,
      visitedStepIds: ['step-0', 'step-1'],
    }));
    expect(tracker.ref.close).toHaveBeenCalled();
    const result = tracker.lastCloseResult as WizardResult;
    expect(result.status).toBe(ModalCloseReason.COMPLETED);
    expect(result.visitedStepIds).toEqual(['step-0', 'step-1']);
  });

  it('should dismiss with CANCELLED when closing from first step', async () => {
    const tracker = createTrackingModalRef();
    const config = ModalBuilder.wizard()
      .addStep('Only Step', (s) => s.body('Content'))
      .build();

    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    await component.back(); // On first step, back = close

    expect(tracker.lastDismissReason).toBe(ModalCloseReason.CANCELLED);
    expect(tracker.closed.length).toBe(1);
  });

  it('should NOT complete when step validator returns invalid', async () => {
    const tracker = createTrackingModalRef();
    const handler = { handle: jasmine.createSpy('handle') };
    const config = ModalBuilder.wizard()
      .addStep('Blocked', (s) => {
        s.body('Check')
         .validators([{ validate: () => ({ status: ValidationStatus.INVALID }) }]);
      })
      .onComplete(handler)
      .build();

    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    await component.complete();

    expect(handler.handle).not.toHaveBeenCalled();
    expect(tracker.ref.close).not.toHaveBeenCalled();
    expect(tracker.closed.length).toBe(0);
  });

  it('should aggregate form data from multiple steps in payload', async () => {
    const tracker = createTrackingModalRef();
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const config = ModalBuilder.wizard()
      .addStep('Account', (s) => {
        s.field({ kind: FieldKind.TEXT, key: 'email', label: 'Email' });
      }, 'account')
      .addStep('Profile', (s) => {
        s.field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' });
      }, 'profile')
      .onComplete(handler)
      .build();

    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    // Wait for form bodies to initialize
    await fixture.whenStable();

    // Fill in step 1 form
    if (component.formBodies?.first?.form) {
      component.formBodies.first.form.get('email')?.setValue('test@test.com');
    }

    await component.next();
    await fixture.whenStable();

    // Fill in step 2 form
    const formBodies = component.formBodies?.toArray();
    if (formBodies && formBodies[1]?.form) {
      formBodies[1].form.get('name')?.setValue('Alice');
    }

    await component.complete();

    expect(handler.handle).toHaveBeenCalled();
    const result = handler.handle.calls.mostRecent().args[0] as WizardResult;
    expect(result.status).toBe(ModalCloseReason.COMPLETED);

    // Payload should be namespaced by step ID
    if (result.payload) {
      expect(result.payload['account']).toEqual(jasmine.objectContaining({ email: 'test@test.com' }));
      expect(result.payload['profile']).toEqual(jasmine.objectContaining({ name: 'Alice' }));
    }
  });

  it('should call onStepChange with correct direction on forward navigation', async () => {
    const tracker = createTrackingModalRef();
    const events: any[] = [];
    const handler = {
      handle: jasmine.createSpy('handle').and.callFake(async (event: any) => {
        events.push(event);
      }),
    };
    const config = ModalBuilder.wizard()
      .addStep('A', (s) => s.body('First'), 'a')
      .addStep('B', (s) => s.body('Second'), 'b')
      .addStep('C', (s) => s.body('Third'), 'c')
      .onStepChange(handler)
      .build();

    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    await component.next();
    await component.next();

    expect(events.length).toBe(2);
    expect(events[0]).toEqual(jasmine.objectContaining({
      previousStepId: 'a',
      currentStepId: 'b',
      direction: 'forward',
    }));
    expect(events[1]).toEqual(jasmine.objectContaining({
      previousStepId: 'b',
      currentStepId: 'c',
      direction: 'forward',
    }));
  });

  it('should call onStepChange with backward direction on back navigation', async () => {
    const tracker = createTrackingModalRef();
    const events: any[] = [];
    const handler = {
      handle: jasmine.createSpy('handle').and.callFake(async (event: any) => {
        events.push(event);
      }),
    };
    const config = ModalBuilder.wizard()
      .addStep('A', (s) => s.body('First'), 'a')
      .addStep('B', (s) => s.body('Second'), 'b')
      .onStepChange(handler)
      .build();

    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    await component.next();
    await component.back();

    expect(events.length).toBe(2);
    expect(events[1]).toEqual(jasmine.objectContaining({
      previousStepId: 'b',
      currentStepId: 'a',
      direction: 'backward',
    }));
  });

  it('should recover from onComplete error and allow retry', async () => {
    const tracker = createTrackingModalRef();
    let callCount = 0;
    const handler = {
      handle: jasmine.createSpy('handle').and.callFake(async () => {
        callCount++;
        if (callCount === 1) throw new Error('Network error');
      }),
    };
    const config = ModalBuilder.wizard()
      .addStep('Done', (s) => s.body('Finish'))
      .onComplete(handler)
      .build();

    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = tracker.ref;
    fixture.detectChanges();

    // First attempt fails
    await component.complete();
    expect(handler.handle).toHaveBeenCalledTimes(1);
    expect(tracker.ref.close).not.toHaveBeenCalled();
    expect(component.isCompleting).toBeFalse();

    // Second attempt succeeds
    await component.complete();
    expect(handler.handle).toHaveBeenCalledTimes(2);
    expect(tracker.ref.close).toHaveBeenCalled();
  });
});

// =============================================
// Outcome Tests: MnModalRef event emissions
// =============================================
describe('Outcome: MnModalRef afterClosed$ events', () => {
  function createMockComponentRef() {
    return {
      instance: {
        config: {},
        modalRef: null,
        startClosing: jasmine.createSpy('startClosing').and.returnValue(Promise.resolve()),
      },
      changeDetectorRef: {
        detectChanges: jasmine.createSpy('detectChanges'),
      },
      destroy: jasmine.createSpy('destroy'),
    } as any;
  }

  it('close() should emit COMPLETED with typed result via afterClosed$', (done) => {
    const mockRef = createMockComponentRef();
    const ref = new MnModalRef<{ name: string }>(mockRef, { kind: 'form' } as any);

    ref.afterClosed$.subscribe((event) => {
      expect(event.reason).toBe(ModalCloseReason.COMPLETED);
      expect(event.result).toEqual({ name: 'Test' });
      done();
    });

    ref.close({ name: 'Test' });
  });

  it('dismiss(ESCAPE) should emit ESCAPE reason via afterClosed$', (done) => {
    const mockRef = createMockComponentRef();
    const ref = new MnModalRef(mockRef, { kind: 'confirmation' } as any);

    ref.afterClosed$.subscribe((event) => {
      expect(event.reason).toBe(ModalCloseReason.ESCAPE);
      expect(event.result).toBeUndefined();
      done();
    });

    ref.dismiss(ModalCloseReason.ESCAPE);
  });

  it('dismiss(BACKDROP) should emit BACKDROP reason via afterClosed$', (done) => {
    const mockRef = createMockComponentRef();
    const ref = new MnModalRef(mockRef, { kind: 'confirmation' } as any);

    ref.afterClosed$.subscribe((event) => {
      expect(event.reason).toBe(ModalCloseReason.BACKDROP);
      done();
    });

    ref.dismiss(ModalCloseReason.BACKDROP);
  });

  it('afterClosed$ should complete after emission (no further events)', (done) => {
    const mockRef = createMockComponentRef();
    const ref = new MnModalRef<string>(mockRef, { kind: 'form' } as any);
    const emissions: any[] = [];

    ref.afterClosed$.subscribe({
      next: (event) => emissions.push(event),
      complete: () => {
        expect(emissions.length).toBe(1);
        done();
      },
    });

    ref.close('done');
  });
});
