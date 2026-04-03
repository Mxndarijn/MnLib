import { BaseModalBuilder } from './base-modal.builder';
import {
  FormModalConfig,
  ModalKind,
  FormFieldConfig,
  FormFieldGroup,
  FormRow,
  FormRowField,
  FormLayoutMode,
  SubmitMode,
  ModalResultHandler,
  FormValidator,
} from '../mn-modal.types';

export class FormModalBuilder<TModel = unknown, TResult = TModel> extends BaseModalBuilder<
  FormModalConfig<TModel, TResult>,
  TResult
> {
  private currentRow: FormRowField<TModel>[] = [];
  private currentRowColumns = 1;

  constructor() {
    super({
      kind: ModalKind.FORM,
      fields: [],
      rows: [],
    });
  }

  /**
   * Add a field as a full-width row (single column).
   * This is the simple API — each field gets its own row.
   */
  field(field: FormFieldConfig<TModel>): this {
    this.flushCurrentRow();
    this.config.fields.push(field);
    this.config.rows!.push({
      columns: 1,
      fields: [{ field, span: 1 }],
    });
    return this;
  }

  /**
   * Start a new row with the specified number of columns.
   * All subsequent `addToRow()` calls will add fields to this row
   * until the next `row()` or `field()` call.
   *
   * @example
   * .row(2)
   *   .addToRow({ kind: FieldKind.TEXT, key: 'firstName', label: 'First Name' })
   *   .addToRow({ kind: FieldKind.TEXT, key: 'lastName', label: 'Last Name' })
   * .row(3)
   *   .addToRow({ kind: FieldKind.TEXT, key: 'city', label: 'City' }, 2)
   *   .addToRow({ kind: FieldKind.TEXT, key: 'zip', label: 'ZIP' })
   */
  row(columns: number = 2): this {
    this.flushCurrentRow();
    this.currentRowColumns = columns;
    return this;
  }

  /**
   * Add a field to the current row started by `row()`.
   * @param field - The field configuration
   * @param span - How many columns this field should span (default: 1)
   */
  addToRow(field: FormFieldConfig<TModel>, span: number = 1): this {
    this.config.fields.push(field);
    this.currentRow.push({ field, span });
    return this;
  }

  private flushCurrentRow(): void {
    if (this.currentRow.length > 0) {
      this.config.rows!.push({
        columns: this.currentRowColumns,
        fields: [...this.currentRow],
      });
      this.currentRow = [];
      this.currentRowColumns = 1;
    }
  }

  layout(mode: FormLayoutMode): this {
    this.config.layout = mode;
    return this;
  }

  initialValue(value: Partial<TModel>): this {
    this.config.initialValue = value;
    return this;
  }

  submitMode(mode: SubmitMode): this {
    this.config.submitMode = mode;
    return this;
  }

  onComplete(handler: ModalResultHandler<TResult>): this {
    this.config.onComplete = handler;
    return this;
  }

  /**
   * Add form-level validators for cross-field validation.
   * These receive the entire form value and return an error map or null.
   */
  formValidators(validators: FormValidator<TModel>[]): this {
    this.config.formValidators = validators;
    return this;
  }

  /**
   * Add Angular FormGroup-level validators.
   * These are standard Angular ValidatorFn applied to the FormGroup itself.
   */
  groupValidators(validators: any[]): this {
    this.config.groupValidators = validators;
    return this;
  }

  /**
   * Add a field group with a section header.
   * Groups visually separate fields with a title and optional description.
   */
  fieldGroup(group: FormFieldGroup<TModel>): this {
    this.flushCurrentRow();
    if (!this.config.fieldGroups) {
      this.config.fieldGroups = [];
    }
    // Also add group fields to the flat fields array for form control creation
    group.fields.forEach(f => this.config.fields.push(f));
    // Build rows for the group if not provided
    if (!group.rows) {
      group.rows = group.fields.map(f => ({
        columns: 1,
        fields: [{ field: f, span: 1 }],
      }));
    }
    this.config.fieldGroups.push(group);
    return this;
  }

  override build(): Readonly<FormModalConfig<TModel, TResult>> {
    this.flushCurrentRow();
    return super.build();
  }
}
