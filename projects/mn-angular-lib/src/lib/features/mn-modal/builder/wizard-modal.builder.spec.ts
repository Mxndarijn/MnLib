import {ModalBuilder} from './modal.builder';
import {FieldKind, ModalKind, StepState, ValidationStatus, WizardFlowMode, WizardModalConfig,} from '../mn-modal.types';

describe('WizardModalBuilder', () => {
  it('should create a config with correct kind', () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => s.body('Hello'))
      .build();
    expect(config.kind).toBe(ModalKind.WIZARD);
  });

  it('should add steps with auto-generated IDs', () => {
    const config = ModalBuilder.wizard()
      .addStep('First', (s) => s.body('A'))
      .addStep('Second', (s) => s.body('B'))
      .build();
    expect(config.steps.length).toBe(2);
    expect(config.steps[0].id).toBe('step-0');
    expect(config.steps[1].id).toBe('step-1');
  });

  it('should add steps with custom IDs', () => {
    const config = ModalBuilder.wizard()
      .addStep('Account', (s) => s.body('Info'), 'account')
      .addStep('Profile', (s) => s.body('Details'), 'profile')
      .build();
    expect(config.steps[0].id).toBe('account');
    expect(config.steps[1].id).toBe('profile');
  });

  it('should set step titles', () => {
    const config = ModalBuilder.wizard()
      .addStep('Account Info', (s) => s.body(''))
      .build();
    expect(config.steps[0].title).toBe('Account Info');
  });

  it('should create steps with fields via StepBuilder', () => {
    const config = ModalBuilder.wizard()
      .addStep('Form Step', (s) => {
        s.field({ kind: FieldKind.TEXT, key: 'email', label: 'Email' })
         .field({ kind: FieldKind.NUMBER, key: 'age', label: 'Age', min: 0, max: 120 })
         .field({ kind: FieldKind.SELECT, key: 'role', label: 'Role', options: [{ label: 'Admin', value: 'admin' }] });
      })
      .build();
    expect(config.steps[0].fields!.length).toBe(3);
    expect(config.steps[0].fields![0].kind).toBe(FieldKind.TEXT);
    expect(config.steps[0].fields![1].kind).toBe(FieldKind.NUMBER);
    expect(config.steps[0].fields![2].kind).toBe(FieldKind.SELECT);
  });

  it('should set a component body without inputs', () => {
    class DummyStepBody {
    }

    const config = ModalBuilder.wizard()
      .addStep('Custom', (s) => s.body(DummyStepBody))
      .build();
    expect(config.steps[0].body).toBe(DummyStepBody);
    expect(config.steps[0].bodyInputs).toBeUndefined();
  });

  it('should set a component body with inputs', () => {
    class DummyStepBody {
    }

    const inputs = {associationId: 'assoc-1'};
    const config = ModalBuilder.wizard()
      .addStep('Custom', (s) => s.body(DummyStepBody, inputs))
      .build();
    expect(config.steps[0].body).toBe(DummyStepBody);
    expect(config.steps[0].bodyInputs).toEqual(inputs);
  });

  it('should set guards on steps', () => {
    const guard = {
      canEnter: () => true,
      canExit: () => false,
    };
    const config = ModalBuilder.wizard()
      .addStep('Guarded', (s) => s.body('X').guard(guard))
      .build();
    expect(config.steps[0].guard).toBe(guard);
  });

  it('should set validators on steps', () => {
    const validator = {
      validate: () => ({ status: ValidationStatus.VALID }),
    };
    const config = ModalBuilder.wizard()
      .addStep('Validated', (s) => s.body('X').validators([validator]))
      .build();
    expect(config.steps[0].validators!.length).toBe(1);
  });

  it('should set flow mode', () => {
    const config = ModalBuilder.wizard()
      .flow(WizardFlowMode.FREE)
      .addStep('S', (s) => s.body(''))
      .build();
    expect(config.flow).toBe(WizardFlowMode.FREE);
  });

  it('should set startAt', () => {
    const config = ModalBuilder.wizard()
      .addStep('A', (s) => s.body(''), 'a')
      .addStep('B', (s) => s.body(''), 'b')
      .startAt('b')
      .build();
    expect(config.startStepId).toBe('b');
  });

  it('should set onStepChange handler', () => {
    const handler = { handle: async () => {} };
    const config = ModalBuilder.wizard()
      .onStepChange(handler)
      .addStep('S', (s) => s.body(''))
      .build();
    expect(config.onStepChange).toBe(handler);
  });

  it('should set onComplete handler', () => {
    const handler = { handle: async () => {} };
    const config = ModalBuilder.wizard()
      .onComplete(handler)
      .addStep('S', (s) => s.body(''))
      .build();
    expect(config.onComplete).toBe(handler);
  });

  it('should accept raw WizardStepConfig via step()', () => {
    const config = ModalBuilder.wizard()
      .step({ id: 'raw', title: 'Raw Step', body: 'Raw body' })
      .build();
    expect(config.steps[0].id).toBe('raw');
    expect(config.steps[0].title).toBe('Raw Step');
  });

  it('should freeze the config', () => {
    const config = ModalBuilder.wizard()
      .addStep('S', (s) => s.body(''))
      .build();
    expect(() => (config as WizardModalConfig).title = 'x').toThrow();
  });

  it('should default step state to PENDING', () => {
    const config = ModalBuilder.wizard()
      .addStep('S', (s) => s.body(''))
      .build();
    expect(config.steps[0].state).toBe(StepState.PENDING);
  });

  it('should allow overriding step state', () => {
    const config = ModalBuilder.wizard()
      .addStep('S', (s) => s.body('').state(StepState.ACTIVE))
      .build();
    expect(config.steps[0].state).toBe(StepState.ACTIVE);
  });

  it('should support declarative addRow in steps', () => {
    const config = ModalBuilder.wizard()
      .addStep('Step 1', (s) => {
        s.addRow(2, (row) => {
          row.add({ kind: FieldKind.TEXT, key: 'first', label: 'First' });
          row.add({ kind: FieldKind.TEXT, key: 'last', label: 'Last' });
        });
      })
      .build();

    expect(config.steps[0].rows!.length).toBe(1);
    expect(config.steps[0].rows![0].columns).toBe(2);
    expect(config.steps[0].fields!.length).toBe(2);
  });

  it('should support generic TResult', () => {
    type MyResult = {
      id: string;
      value: number;
    }
    const config = ModalBuilder.wizard<MyResult>()
      .onBeforeComplete([(_payload) => {
        // payload: Record<ModalStepId, Record<string, any>>
        return null; // Should compile
      }])
      .addStep('Step 1', (s) => s.body(''))
      .build();

    expect(config.kind).toBe(ModalKind.WIZARD);
  });

  it('should allow structured payload mapping (concept)', () => {
    type WizardData = {
      account: { email: string };
      profile: { age: number };
    }

    // This is mostly a compile-time test for the generic TResult propagation
    const config = ModalBuilder.wizard<WizardData>()
      .addStep<{ email: string }>('Account', (s) => {
        s.field({ kind: FieldKind.TEXT, key: 'email', label: 'Email' });
      }, 'account')
      .addStep<{ age: number }>('Profile', (s) => {
        s.field({ kind: FieldKind.NUMBER, key: 'age', label: 'Age' });
      }, 'profile')
      .build();

    expect(config.steps.length).toBe(2);
    expect(config.steps[0].id).toBe('account');
    expect(config.steps[1].id).toBe('profile');
  });

  it('should support top-level initialValue', () => {
    type MyModel = { name: string; age: number; }
    const config = ModalBuilder.wizard<MyModel>()
      .initialValue({ name: 'Global' })
      .addStep('S1', (s) => s.body(''))
      .build();

    expect(config.initialValue).toEqual({ name: 'Global' });
  });
});
