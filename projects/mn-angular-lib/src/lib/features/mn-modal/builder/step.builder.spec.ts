import { Validators } from '@angular/forms';
import { StepBuilder } from './step.builder';
import { ModalBuilder } from './modal.builder';
import {
  FieldKind,
  StepState,
  ValidationStatus,
} from '../mn-modal.types';

describe('StepBuilder', () => {
  it('should create a step with id and title', () => {
    const step = new StepBuilder('s1', 'Step One').body('Hello').build();
    expect(step.id).toBe('s1');
    expect(step.title).toBe('Step One');
    expect(step.body).toBe('Hello');
  });

  it('should default state to PENDING', () => {
    const step = new StepBuilder('s1', 'S').build();
    expect(step.state).toBe(StepState.PENDING);
  });

  it('should allow overriding state', () => {
    const step = new StepBuilder('s1', 'S').state(StepState.ACTIVE).build();
    expect(step.state).toBe(StepState.ACTIVE);
  });

  // ---- .field() ----

  it('should add fields via .field()', () => {
    const step = new StepBuilder('s1', 'S')
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .field({ kind: FieldKind.NUMBER, key: 'age', label: 'Age' })
      .build();
    expect(step.fields!.length).toBe(2);
    expect(step.fields![0].kind).toBe(FieldKind.TEXT);
    expect(step.fields![1].kind).toBe(FieldKind.NUMBER);
  });

  it('should create one row per .field() call', () => {
    const step = new StepBuilder('s1', 'S')
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .field({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .build();
    expect(step.rows!.length).toBe(2);
    expect(step.rows![0].columns).toBe(1);
    expect(step.rows![1].columns).toBe(1);
  });

  // ---- .row() / .addToRow() ----

  it('should create a multi-column row', () => {
    const step = new StepBuilder('s1', 'S')
      .row(2)
        .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
        .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .build();
    expect(step.rows!.length).toBe(1);
    expect(step.rows![0].columns).toBe(2);
    expect(step.rows![0].fields.length).toBe(2);
  });

  it('should add row fields to the flat fields array', () => {
    const step = new StepBuilder('s1', 'S')
      .row(2)
        .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
        .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .build();
    expect(step.fields!.length).toBe(2);
  });

  it('should support span in addToRow', () => {
    const step = new StepBuilder('s1', 'S')
      .row(3)
        .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' }, 2)
        .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .build();
    expect(step.rows![0].fields[0].span).toBe(2);
    expect(step.rows![0].fields[1].span).toBe(1);
  });

  it('should flush pending row on .field()', () => {
    const step = new StepBuilder('s1', 'S')
      .row(2)
        .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
        .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .field({ kind: FieldKind.TEXT, key: 'c', label: 'C' })
      .build();
    expect(step.rows!.length).toBe(2);
    expect(step.rows![0].columns).toBe(2);
    expect(step.rows![1].columns).toBe(1);
  });

  it('should flush pending row on next .row()', () => {
    const step = new StepBuilder('s1', 'S')
      .row(2)
        .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
        .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .row(3)
        .addToRow({ kind: FieldKind.TEXT, key: 'c', label: 'C' })
        .addToRow({ kind: FieldKind.TEXT, key: 'd', label: 'D' })
        .addToRow({ kind: FieldKind.TEXT, key: 'e', label: 'E' })
      .build();
    expect(step.rows!.length).toBe(2);
    expect(step.rows![0].columns).toBe(2);
    expect(step.rows![1].columns).toBe(3);
  });

  it('should flush pending row on .build()', () => {
    const step = new StepBuilder('s1', 'S')
      .row(2)
        .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
        .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .build();
    expect(step.rows!.length).toBe(1);
  });

  // ---- .fieldGroup() ----

  it('should add a field group', () => {
    const step = new StepBuilder('s1', 'S')
      .fieldGroup({
        title: 'Personal',
        fields: [
          { kind: FieldKind.TEXT, key: 'name', label: 'Name' },
          { kind: FieldKind.TEXT, key: 'email', label: 'Email' },
        ],
      })
      .build();
    expect(step.fieldGroups!.length).toBe(1);
    expect(step.fieldGroups![0].title).toBe('Personal');
    expect(step.fieldGroups![0].fields.length).toBe(2);
  });

  it('should add group fields to flat fields array', () => {
    const step = new StepBuilder('s1', 'S')
      .fieldGroup({
        title: 'Info',
        fields: [
          { kind: FieldKind.TEXT, key: 'a', label: 'A' },
        ],
      })
      .build();
    expect(step.fields!.length).toBe(1);
  });

  it('should auto-generate rows for groups without explicit rows', () => {
    const step = new StepBuilder('s1', 'S')
      .fieldGroup({
        title: 'Info',
        fields: [
          { kind: FieldKind.TEXT, key: 'a', label: 'A' },
          { kind: FieldKind.TEXT, key: 'b', label: 'B' },
        ],
      })
      .build();
    expect(step.fieldGroups![0].rows!.length).toBe(2);
  });

  it('should preserve explicit rows on field groups', () => {
    const step = new StepBuilder('s1', 'S')
      .fieldGroup({
        title: 'Info',
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
      })
      .build();
    expect(step.fieldGroups![0].rows!.length).toBe(1);
    expect(step.fieldGroups![0].rows![0].columns).toBe(2);
  });

  it('should support visible condition on field groups', () => {
    const visibleFn = (form: any) => form.showGroup === true;
    const step = new StepBuilder('s1', 'S')
      .fieldGroup({
        title: 'Conditional',
        fields: [{ kind: FieldKind.TEXT, key: 'x', label: 'X' }],
        visible: visibleFn,
      })
      .build();
    expect(step.fieldGroups![0].visible).toBe(visibleFn);
  });

  // ---- .formValidators() ----

  it('should set form validators', () => {
    const validator = (form: any) => form.a !== form.b ? { b: 'Mismatch' } : null;
    const step = new StepBuilder('s1', 'S')
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .field({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .formValidators([validator])
      .build();
    expect(step.formValidators!.length).toBe(1);
    expect(step.formValidators![0]).toBe(validator);
  });

  // ---- .groupValidators() ----

  it('should set group validators', () => {
    const step = new StepBuilder('s1', 'S')
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .groupValidators([Validators.required])
      .build();
    expect(step.groupValidators!.length).toBe(1);
  });

  // ---- .initialValue() ----

  it('should set initial values', () => {
    const step = new StepBuilder<{ name: string }>('s1', 'S')
      .field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
      .initialValue({ name: 'John' })
      .build();
    expect(step.initialValue).toEqual({ name: 'John' });
  });

  // ---- .guard() ----

  it('should set guard', () => {
    const guard = { canEnter: () => true, canExit: () => false };
    const step = new StepBuilder('s1', 'S')
      .body('X')
      .guard(guard)
      .build();
    expect(step.guard).toBe(guard);
  });

  // ---- .validators() ----

  it('should set step validators', () => {
    const v = { validate: () => ({ status: ValidationStatus.VALID }) };
    const step = new StepBuilder('s1', 'S')
      .body('X')
      .validators([v])
      .build();
    expect(step.validators!.length).toBe(1);
  });

  // ---- Integration with WizardModalBuilder ----

  it('should work with WizardModalBuilder.addStep()', () => {
    const config = ModalBuilder.wizard()
      .addStep('Account', (s) => {
        s.field({ kind: FieldKind.TEXT, key: 'email', label: 'Email' })
         .field({ kind: FieldKind.PASSWORD, key: 'pw', label: 'Password' });
      }, 'account')
      .build();
    expect(config.steps[0].fields!.length).toBe(2);
    expect(config.steps[0].rows!.length).toBe(2);
  });

  it('should pass rows through WizardModalBuilder', () => {
    const config = ModalBuilder.wizard()
      .addStep('Info', (s) => {
        s.row(2)
          .addToRow({ kind: FieldKind.TEXT, key: 'first', label: 'First' })
          .addToRow({ kind: FieldKind.TEXT, key: 'last', label: 'Last' });
      })
      .build();
    expect(config.steps[0].rows!.length).toBe(1);
    expect(config.steps[0].rows![0].columns).toBe(2);
  });

  it('should pass fieldGroups through WizardModalBuilder', () => {
    const config = ModalBuilder.wizard()
      .addStep('Grouped', (s) => {
        s.fieldGroup({
          title: 'Section',
          fields: [{ kind: FieldKind.TEXT, key: 'x', label: 'X' }],
        });
      })
      .build();
    expect(config.steps[0].fieldGroups!.length).toBe(1);
  });

  it('should pass formValidators through WizardModalBuilder', () => {
    const v = (form: any) => null;
    const config = ModalBuilder.wizard()
      .addStep('V', (s) => {
        s.field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
         .formValidators([v]);
      })
      .build();
    expect(config.steps[0].formValidators!.length).toBe(1);
  });

  it('should pass initialValue through WizardModalBuilder', () => {
    const config = ModalBuilder.wizard()
      .addStep('Init', (s) => {
        s.field({ kind: FieldKind.TEXT, key: 'name', label: 'Name' })
         .initialValue({ name: 'Default' });
      })
      .build();
    expect(config.steps[0].initialValue).toEqual({ name: 'Default' });
  });

  it('should set nextLabel, backLabel, and hideBack', () => {
    const step = new StepBuilder('s1', 'S')
      .nextLabel('Forward')
      .backLabel('Go Back')
      .hideBack(true)
      .build();
    expect(step.nextLabel).toBe('Forward');
    expect(step.backLabel).toBe('Go Back');
    expect(step.hideBack).toBeTrue();
  });
});
