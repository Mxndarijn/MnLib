import {BaseModalBuilder} from './base-modal.builder';
import {StepBuilder} from './step.builder';
import {FormLayoutBuilder} from './form-layout.builder';
import {
  FormFieldConfig,
  FormFieldGroup,
  ModalKind,
  ModalResultHandler,
  ModalStepId,
  WizardBeforeCompleteValidator,
  WizardFlowMode,
  WizardModalConfig,
  WizardResult,
  WizardStepChangeHandler,
  WizardStepConfig,
} from '../mn-modal.types';

export class WizardModalBuilder<TResult = WizardResult> extends BaseModalBuilder<
  WizardModalConfig<TResult>,
  TResult
> {
  constructor() {
    super({
      kind: ModalKind.WIZARD,
      steps: [],
    } as any);
  }

  /**
   * Set initial values for the entire wizard.
   * Note: This will be merged with individual step initial values.
   */
  initialValue(value: Partial<TResult>): this {
    this.config.initialValue = value;
    return this;
  }

  /**
   * Description is not supported for wizard modals.
   * Use step-level body text instead.
   */
  override description(_description: string): this {
    return this;
  }

  override body(body: any): this {
    return super.body(body);
  }

  override field(field: FormFieldConfig<any>): this {
    return super.field(field);
  }

  override row(columns: number = 2): this {
    return super.row(columns);
  }

  override addToRow(field: FormFieldConfig<any>, span: number = 1): this {
    return super.addToRow(field, span);
  }

  override addRow(
    columns: number,
    buildFn: (row: { add: (field: FormFieldConfig<any>, span?: number) => void }) => void
  ): this {
    return super.addRow(columns, buildFn as any);
  }

  override fieldGroup(group: FormFieldGroup<any>): this;
  override fieldGroup(
    title: string,
    buildFn: (group: FormLayoutBuilder<any, any>) => void
  ): this;
  override fieldGroup(
    title: string,
    description: string,
    buildFn: (group: FormLayoutBuilder<any, any>) => void
  ): this;
  override fieldGroup(
    arg1: string | FormFieldGroup<any>,
    arg2?: string | ((group: FormLayoutBuilder<any, any>) => void),
    arg3?: (group: FormLayoutBuilder<any, any>) => void
  ): this {
    return super.fieldGroup(arg1 as any, arg2 as any, arg3 as any);
  }

  step<TStepModel = any>(
    step: WizardStepConfig<TStepModel> | ((builder: StepBuilder<TStepModel>) => void)
  ): this {
    if (typeof step === 'function') {
      const builder = new StepBuilder<TStepModel>('', '');
      step(builder);
      const builtStep = builder.build();
      this.config.steps.push(builtStep);
    } else {
      this.config.steps.push(step as WizardStepConfig);
    }
    return this;
  }

  addStep<TStepModel = any>(
    title: string,
    buildFn: (builder: StepBuilder<TStepModel>) => void,
    id?: ModalStepId
  ): this {
    const stepId = id || `step-${this.config.steps.length}`;
    const builder = new StepBuilder<TStepModel>(stepId, title);
    buildFn(builder);
    const builtStep = builder.build();
    this.config.steps.push(builtStep);
    return this;
  }

  startAt(stepId: ModalStepId): this {
    this.config.startStepId = stepId;
    return this;
  }

  flow(mode: WizardFlowMode): this {
    this.config.flow = mode;
    return this;
  }

  onStepChange(handler: WizardStepChangeHandler): this {
    this.config.onStepChange = handler;
    return this;
  }

  onComplete(handler: ModalResultHandler<TResult>): this {
    this.config.onComplete = handler;
    return this;
  }

  onBeforeComplete(validators: WizardBeforeCompleteValidator<TResult>[]): this {
    this.config.onBeforeComplete = validators;
    return this;
  }
}
