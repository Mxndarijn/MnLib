import {
  WizardStepConfig,
  FormFieldConfig,
  FormFieldGroup,
  FormValidator,
  StepState,
  StepGuard,
  StepValidator,
  ModalStepId,
} from '../mn-modal.types';
import { FormLayoutBuilder } from './form-layout.builder';

export class StepBuilder<TModel = any> {
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

  body(body: any): this {
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

  /**
   * Add a field to this step. This is the single API for all field types.
   *
   * @example
   * s.field({ kind: FieldKind.TEXT, key: 'email', label: 'Email', validators: [Validators.required] })
   * s.field({ kind: FieldKind.SELECT, key: 'role', label: 'Role', options: [...] })
   */
  field(field: FormFieldConfig<TModel>): this {
    return this.layoutBuilder.field(field);
  }

  /**
   * Start a new row with the specified number of columns.
   * All subsequent `addToRow()` calls will add fields to this row.
   */
  row(columns: number = 2): this {
    return this.layoutBuilder.row(columns);
  }

  /**
   * Add a field to the current row started by `row()`.
   */
  addToRow(field: FormFieldConfig<TModel>, span: number = 1): this {
    return this.layoutBuilder.addToRow(field, span);
  }

  /**
   * Declarative way to add a row.
   */
  addRow(
    columns: number,
    buildFn: (row: { add: (field: FormFieldConfig<TModel>, span?: number) => void }) => void
  ): this {
    return this.layoutBuilder.addRow(columns, buildFn);
  }

  /**
   * Add a field group with a section header.
   */
  fieldGroup(group: FormFieldGroup<TModel>): this;
  /**
   * Add a field group using a functional builder.
   */
  fieldGroup(
    title: string,
    buildFn: (group: FormLayoutBuilder<TModel, any>) => void
  ): this;
  /**
   * Add a field group with title, description, and a functional builder.
   */
  fieldGroup(
    title: string,
    description: string,
    buildFn: (group: FormLayoutBuilder<TModel, any>) => void
  ): this;
  fieldGroup(
    arg1: string | FormFieldGroup<TModel>,
    arg2?: string | ((group: FormLayoutBuilder<TModel, any>) => void),
    arg3?: (group: FormLayoutBuilder<TModel, any>) => void
  ): this {
    return this.layoutBuilder.fieldGroup(arg1 as any, arg2 as any, arg3 as any);
  }

  /**
   * Add form-level validators for cross-field validation within this step.
   */
  formValidators(validators: FormValidator<TModel>[]): this {
    return this.layoutBuilder.formValidators(validators);
  }

  /**
   * Add Angular FormGroup-level validators for this step.
   */
  groupValidators(validators: any[]): this {
    return this.layoutBuilder.groupValidators(validators);
  }

  /**
   * Set initial values for fields in this step.
   */
  initialValue(value: Partial<TModel>): this {
    return this.layoutBuilder.initialValue(value);
  }

  /**
   * Set a visibility condition for this step based on aggregated wizard data.
   */
  visible(
    condition: (aggregatedData: Record<ModalStepId, Record<string, any>>) => boolean
  ): this {
    this.config.visible = condition;
    return this;
  }

  /**
   * Set a custom label for the 'Next' button on this step.
   */
  nextLabel(label: string): this {
    this.config.nextLabel = label;
    return this;
  }

  /**
   * Set a custom label for the 'Back' button on this step.
   */
  backLabel(label: string): this {
    this.config.backLabel = label;
    return this;
  }

  /**
   * Hide the 'Back' button on this step.
   */
  hideBack(hide: boolean = true): this {
    this.config.hideBack = hide;
    return this;
  }

  build(): WizardStepConfig<TModel> {
    this.layoutBuilder.flushCurrentRow();
    return this.config;
  }
}
