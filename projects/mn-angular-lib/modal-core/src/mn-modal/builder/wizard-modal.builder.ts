import {BaseModalBuilder} from './base-modal.builder';
import {StepBuilder} from './step.builder';
import {
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
    } as unknown as WizardModalConfig<TResult>);
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

  step<TStepModel = unknown>(
    step: WizardStepConfig<TStepModel> | ((builder: StepBuilder<TStepModel>) => void)
  ): this {
    if (typeof step === 'function') {
      const builder = new StepBuilder<TStepModel>('', '');
      step(builder);
      const builtStep = builder.build();
      this.config.steps.push(builtStep as unknown as WizardStepConfig<unknown>);
    } else {
      this.config.steps.push(step as unknown as WizardStepConfig<unknown>);
    }
    return this;
  }

  addStep<TStepModel = unknown>(
    title: string,
    buildFn: (builder: StepBuilder<TStepModel>) => void,
    id?: ModalStepId
  ): this {
    const stepId = id || `step-${this.config.steps.length}`;
    const builder = new StepBuilder<TStepModel>(stepId, title);
    buildFn(builder);
    const builtStep = builder.build();
    this.config.steps.push(builtStep as unknown as WizardStepConfig<unknown>);
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
