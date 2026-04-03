import { BaseModalBuilder } from './base-modal.builder';
import { StepBuilder } from './step.builder';
import {
  WizardModalConfig,
  ModalKind,
  WizardStepConfig,
  ModalStepId,
  WizardFlowMode,
  WizardStepChangeHandler,
  ModalResultHandler,
  WizardResult,
  WizardBeforeCompleteValidator,
} from '../mn-modal.types';

export class WizardModalBuilder extends BaseModalBuilder<WizardModalConfig, WizardResult> {
  constructor() {
    super({
      kind: ModalKind.WIZARD,
      steps: [],
    });
  }

  step(step: WizardStepConfig | ((builder: StepBuilder) => void)): this {
    if (typeof step === 'function') {
      const builder = new StepBuilder('', '');
      step(builder);
      const builtStep = builder.build();
      this.config.steps.push(builtStep);
    } else {
      this.config.steps.push(step);
    }
    return this;
  }

  addStep(title: string, buildFn: (builder: StepBuilder) => void, id?: ModalStepId): this {
    const stepId = id || `step-${this.config.steps.length}`;
    const builder = new StepBuilder(stepId, title);
    buildFn(builder);
    this.config.steps.push(builder.build());
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

  onComplete(handler: ModalResultHandler<WizardResult>): this {
    this.config.onComplete = handler;
    return this;
  }

  onBeforeComplete(validators: WizardBeforeCompleteValidator[]): this {
    this.config.onBeforeComplete = validators;
    return this;
  }
}
