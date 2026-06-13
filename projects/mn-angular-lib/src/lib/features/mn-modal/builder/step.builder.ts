import {
  WizardStepConfig,
  FormFieldConfig,
  FormFieldGroup,
  FormValidator,
  StepBodyConfig,
  StepState,
  StepGuard,
  StepValidator,
  ModalStepId,
} from '../mn-modal.types';
import {FormLayoutBuilder, ChainableGroupBuilder} from './form-layout.builder';
import {ValidatorFn} from '@angular/forms';

export class StepBuilder<TModel = unknown> {
  private config: WizardStepConfig<TModel>;
  private layoutBuilder: FormLayoutBuilder<TModel, this>;

  constructor(id: string, title: string) {
    this.config = {
      id,
      title,
      fields: [],
      state: StepState.PENDING,
    };
    this.layoutBuilder = new FormLayoutBuilder(this.config, this);
  }

  body(body: StepBodyConfig): this {
    this.config.body = body;
    return this;
  }

  state(state: StepState): this {
    this.config.state = state;
    return this;
  }

  guard(guard: StepGuard): this {
    this.config.guard = guard;
    return this;
  }

  validators(validators: StepValidator[]): this {
    this.config.validators = validators;
    return this;
  }

  field(field: FormFieldConfig<TModel>): this {
    return this.layoutBuilder.field(field);
  }

  row(columns = 2): this {
    return this.layoutBuilder.row(columns);
  }

  addToRow(field: FormFieldConfig<TModel>, span = 1): this {
    return this.layoutBuilder.addToRow(field, span);
  }

  addRow(
    columns: number,
    buildFn: (row: { add: (field: FormFieldConfig<TModel>, span?: number) => void }) => void
  ): this {
    return this.layoutBuilder.addRow(columns, buildFn);
  }

  fieldGroup(group: FormFieldGroup<TModel>): this;
  fieldGroup(title: string, buildFn: (group: ChainableGroupBuilder<TModel>) => void): this;
  fieldGroup(title: string, description: string, buildFn: (group: ChainableGroupBuilder<TModel>) => void): this;
  fieldGroup(
    arg1: string | FormFieldGroup<TModel>,
    arg2?: string | ((group: ChainableGroupBuilder<TModel>) => void),
    arg3?: (group: ChainableGroupBuilder<TModel>) => void
  ): this {
    if (typeof arg1 !== 'string') {
      return this.layoutBuilder.fieldGroup(arg1);
    }
    if (typeof arg2 === 'string') {
      return this.layoutBuilder.fieldGroup(arg1, arg2, arg3!);
    }
    return this.layoutBuilder.fieldGroup(arg1, arg2!);
  }

  formValidators(validators: FormValidator<TModel>[]): this {
    return this.layoutBuilder.formValidators(validators);
  }

  groupValidators(validators: ValidatorFn[]): this {
    return this.layoutBuilder.groupValidators(validators);
  }

  initialValue(value: Partial<TModel>): this {
    return this.layoutBuilder.initialValue(value);
  }

  visible(
    condition: (aggregatedData: Record<ModalStepId, Record<string, unknown>>) => boolean
  ): this {
    this.config.visible = condition;
    return this;
  }

  nextLabel(label: string): this {
    this.config.nextLabel = label;
    return this;
  }

  backLabel(label: string): this {
    this.config.backLabel = label;
    return this;
  }

  hideBack(hide = true): this {
    this.config.hideBack = hide;
    return this;
  }

  build(): WizardStepConfig<TModel> {
    this.layoutBuilder.flushCurrentRow();
    return this.config;
  }
}
