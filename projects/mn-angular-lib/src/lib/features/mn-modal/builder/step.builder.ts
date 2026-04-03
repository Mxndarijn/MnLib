import {
  WizardStepConfig,
  FormFieldConfig,
  FormFieldGroup,
  FormRow,
  FormRowField,
  FormValidator,
  FieldKind,
  SelectOption,
  StepState,
  StepGuard,
  StepValidator,
  ModalStepId,
  Type,
  ModalInputMap,
} from '../mn-modal.types';

export class StepBuilder<TModel = any> {
  private config: WizardStepConfig<TModel>;
  private currentRow: FormRowField<TModel>[] = [];
  private currentRowColumns = 1;

  constructor(id: string, title: string) {
    this.config = {
      id,
      title,
      fields: [],
      state: StepState.PENDING,
    };
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
    this.flushCurrentRow();
    this.config.fields = this.config.fields || [];
    this.config.fields.push(field);
    if (!this.config.rows) {
      this.config.rows = [];
    }
    this.config.rows.push({
      columns: 1,
      fields: [{ field, span: 1 }],
    });
    return this;
  }

  /**
   * Start a new row with the specified number of columns.
   * All subsequent `addToRow()` calls will add fields to this row.
   */
  row(columns: number = 2): this {
    this.flushCurrentRow();
    this.currentRowColumns = columns;
    return this;
  }

  /**
   * Add a field to the current row started by `row()`.
   */
  addToRow(field: FormFieldConfig<TModel>, span: number = 1): this {
    this.config.fields = this.config.fields || [];
    this.config.fields.push(field);
    this.currentRow.push({ field, span });
    return this;
  }

  private flushCurrentRow(): void {
    if (this.currentRow.length > 0) {
      if (!this.config.rows) {
        this.config.rows = [];
      }
      this.config.rows.push({
        columns: this.currentRowColumns,
        fields: [...this.currentRow],
      });
      this.currentRow = [];
      this.currentRowColumns = 1;
    }
  }

  /**
   * Add a field group with a section header.
   */
  fieldGroup(group: FormFieldGroup<TModel>): this {
    this.flushCurrentRow();
    if (!this.config.fieldGroups) {
      this.config.fieldGroups = [];
    }
    this.config.fields = this.config.fields || [];
    group.fields.forEach(f => this.config.fields!.push(f));
    if (!group.rows) {
      group.rows = group.fields.map(f => ({
        columns: 1,
        fields: [{ field: f, span: 1 }],
      }));
    }
    this.config.fieldGroups.push(group);
    return this;
  }

  /**
   * Add form-level validators for cross-field validation within this step.
   */
  formValidators(validators: FormValidator<TModel>[]): this {
    this.config.formValidators = validators;
    return this;
  }

  /**
   * Add Angular FormGroup-level validators for this step.
   */
  groupValidators(validators: any[]): this {
    this.config.groupValidators = validators;
    return this;
  }

  /**
   * Set initial values for fields in this step.
   */
  initialValue(value: Partial<TModel>): this {
    this.config.initialValue = value;
    return this;
  }

  /**
   * Set a visibility condition for this step based on aggregated wizard data.
   */
  visible(condition: (aggregatedData: Record<ModalStepId, Record<string, any>>) => boolean): this {
    this.config.visible = condition;
    return this;
  }

  build(): WizardStepConfig<TModel> {
    this.flushCurrentRow();
    return this.config;
  }
}
