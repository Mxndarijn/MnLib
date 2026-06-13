import {Validators, ValidatorFn} from '@angular/forms';
import {
  FormFieldConfig,
  FormFieldGroup,
  FormRow,
  FormRowField,
  FormValidator,
  StepBodyConfig,
} from '../mn-modal.types';

/**
 * Shared interface for configurations that support form layouts.
 */
export type FormContainerConfig<TModel = unknown> = {
  fields?: FormFieldConfig<TModel>[];
  rows?: FormRow<TModel>[];
  fieldGroups?: FormFieldGroup<TModel>[];
  formValidators?: FormValidator<TModel>[];
  groupValidators?: ValidatorFn[];
  initialValue?: Partial<TModel>;
  body?: StepBodyConfig;
}

type WithAutoFocus = { autoFocus?: boolean };
type WithValidators = { validators?: ValidatorFn[] };

/**
 * A self-referential type so that field-group builder methods can be chained.
 * e.g. g.field(...).field(...).field(...)
 */
export type ChainableGroupBuilder<TModel> = FormLayoutBuilder<TModel, ChainableGroupBuilder<TModel>>;

/**
 * A builder class that provides form layout capabilities (fields, rows, groups).
 * This can be used as a delegate to avoid code duplication between FormModalBuilder and StepBuilder.
 */
export class FormLayoutBuilder<TModel = unknown, TParent = unknown> {
  private currentRow: FormRowField<TModel>[] = [];
  private currentRowColumns = 1;

  constructor(
    private readonly config: FormContainerConfig<TModel>,
    private parent: TParent
  ) {
    this.config.fields = this.config.fields || [];
    this.config.rows = this.config.rows || [];
  }

  /**
   * Add a custom body/content to the form/step.
   */
  body(body: StepBodyConfig): TParent {
    this.config.body = body;
    return this.parent;
  }

  /**
   * Add a field as a full-width row (single column).
   */
  field(field: FormFieldConfig<TModel>): TParent {
    this.flushCurrentRow();
    this.config.fields = this.config.fields || [];
    this.config.fields.push(field);
    this.config.rows = this.config.rows || [];
    this.config.rows.push({
      columns: 1,
      fields: [{ field, span: 1 }],
    });
    return this.parent;
  }

  /**
   * Start a new row with the specified number of columns.
   * All subsequent `addToRow()` calls will add fields to this row.
   */
  row(columns = 2): TParent {
    this.flushCurrentRow();
    this.currentRowColumns = columns;
    return this.parent;
  }

  /**
   * Add a field to the current row started by `row()`.
   * @param field - The field configuration
   * @param span - How many columns this field should span (default: 1)
   */
  addToRow(field: FormFieldConfig<TModel>, span = 1): TParent {
    this.config.fields = this.config.fields || [];
    this.config.fields.push(field);
    this.currentRow.push({ field, span });
    return this.parent;
  }

  /**
   * Declarative way to add a row.
   * @example
   * .addRow(2, row => {
   *   row.add({ kind: FieldKind.TEXT, key: 'first', ... });
   *   row.add({ kind: FieldKind.TEXT, key: 'last', ... });
   * })
   */
  addRow(
    columns: number,
    buildFn: (row: { add: (field: FormFieldConfig<TModel>, span?: number) => void }) => void
  ): TParent {
    this.flushCurrentRow();
    const rowFields: FormRowField<TModel>[] = [];
    buildFn({
      add: (field: FormFieldConfig<TModel>, span = 1) => {
        this.config.fields = this.config.fields || [];
        this.config.fields.push(field);
        rowFields.push({ field, span });
      },
    });

    if (rowFields.length > 0) {
      this.config.rows = this.config.rows || [];
      this.config.rows.push({
        columns,
        fields: rowFields,
      });
    }
    return this.parent;
  }

  /**
   * Add a field group with a section header.
   */
  fieldGroup(group: FormFieldGroup<TModel>): TParent;
  /**
   * Add a field group using a functional builder.
   */
  fieldGroup(
    title: string,
    buildFn: (group: ChainableGroupBuilder<TModel>) => void
  ): TParent;
  /**
   * Add a field group with title, description, and a functional builder.
   */
  fieldGroup(
    title: string,
    description: string,
    buildFn: (group: ChainableGroupBuilder<TModel>) => void
  ): TParent;
  fieldGroup(
    arg1: string | FormFieldGroup<TModel>,
    arg2?: string | ((group: ChainableGroupBuilder<TModel>) => void),
    arg3?: (group: ChainableGroupBuilder<TModel>) => void
  ): TParent {
    this.flushCurrentRow();

    if (typeof arg1 !== 'string') {
      const group = arg1;
      this.processFieldGroup(group);
      return this.parent;
    }

    const title = arg1;
    let description: string | undefined;
    let buildFn: (group: ChainableGroupBuilder<TModel>) => void;

    if (typeof arg2 === 'string') {
      description = arg2;
      buildFn = arg3!;
    } else {
      buildFn = arg2!;
    }

    const groupConfig: FormContainerConfig<TModel> = {
      fields: [],
      rows: [],
    };
    const groupBuilder = new FormLayoutBuilder<TModel, ChainableGroupBuilder<TModel>>(
      groupConfig,
      null as unknown as ChainableGroupBuilder<TModel>
    );
    (groupBuilder as ChainableGroupBuilder<TModel>).parent = groupBuilder as ChainableGroupBuilder<TModel>;
    buildFn(groupBuilder as ChainableGroupBuilder<TModel>);
    groupBuilder.flushCurrentRow();

    const group: FormFieldGroup<TModel> = {
      title,
      description,
      fields: groupConfig.fields || [],
      rows: groupConfig.rows || [],
    };

    this.processFieldGroup(group);
    return this.parent;
  }

  private processFieldGroup(group: FormFieldGroup<TModel>): void {
    if (!this.config.fieldGroups) {
      this.config.fieldGroups = [];
    }

    // Also add group fields to the flat fields array for form control creation
    this.config.fields = this.config.fields || [];
    const fields = this.config.fields;
    group.fields.forEach((f) => fields.push(f));

    // Build rows for the group if not provided
    if (!group.rows || group.rows.length === 0) {
      group.rows = group.fields.map((f) => ({
        columns: 1,
        fields: [{ field: f, span: 1 }],
      }));
    }

    this.config.fieldGroups.push(group);
  }

  /**
   * Add form-level validators for cross-field validation.
   */
  formValidators(validators: FormValidator<TModel>[]): TParent {
    this.config.formValidators = validators;
    return this.parent;
  }

  /**
   * Add Angular FormGroup-level validators.
   */
  groupValidators(validators: ValidatorFn[]): TParent {
    this.config.groupValidators = validators;
    return this.parent;
  }

  /**
   * Set initial value for fields.
   */
  initialValue(value: Partial<TModel>): TParent {
    this.config.initialValue = value;
    return this.parent;
  }

  /**
   * Set the field to be focused when the form initializes.
   */
  focus(key: keyof TModel): TParent {
    this.config.fields?.forEach(f => {
      (f as WithAutoFocus).autoFocus = false;
    });
    this.config.fieldGroups?.forEach(g => {
      g.fields.forEach(f => {
        (f as WithAutoFocus).autoFocus = false;
      });
    });

    const field = this.config.fields?.find(f => (f as unknown as { key: keyof TModel }).key === key);
    if (field) {
      (field as WithAutoFocus).autoFocus = true;
    }
    return this.parent;
  }

  /**
   * Wraps a field with a fluent API for validation.
   */
  fieldWithValidators(field: FormFieldConfig<TModel>): FieldValidatorBuilder<TModel, TParent> {
    const fieldWithV = field as WithValidators;
    fieldWithV.validators = fieldWithV.validators || [];
    this.field(field);
    return new FieldValidatorBuilder(field, this.parent);
  }

  /**
   * Flushes any pending fields in the current row to the configuration.
   */
  flushCurrentRow(): void {
    if (this.currentRow.length > 0) {
      this.config.rows!.push({
        columns: this.currentRowColumns,
        fields: [...this.currentRow],
      });
      this.currentRow = [];
      this.currentRowColumns = 1;
    }
  }
}

/**
 * A builder for adding validation rules to a field fluently.
 */
export class FieldValidatorBuilder<TModel = unknown, TParent = unknown> {
  constructor(
    private field: FormFieldConfig<TModel>,
    private parent: TParent
  ) {
    (this.field as WithValidators).validators = (this.field as WithValidators).validators || [];
  }

  required(_message?: string): this {
    (this.field as WithValidators).validators!.push(Validators.required);
    return this;
  }

  minLength(length: number): this {
    (this.field as WithValidators).validators!.push(Validators.minLength(length));
    return this;
  }

  maxLength(length: number): this {
    (this.field as WithValidators).validators!.push(Validators.maxLength(length));
    return this;
  }

  pattern(pattern: string | RegExp): this {
    (this.field as WithValidators).validators!.push(Validators.pattern(pattern));
    return this;
  }

  email(): this {
    (this.field as WithValidators).validators!.push(Validators.email);
    return this;
  }

  min(value: number): this {
    (this.field as WithValidators).validators!.push(Validators.min(value));
    return this;
  }

  max(value: number): this {
    (this.field as WithValidators).validators!.push(Validators.max(value));
    return this;
  }

  /**
   * Add a custom validator.
   */
  custom(validator: ValidatorFn): this {
    (this.field as WithValidators).validators!.push(validator);
    return this;
  }

  /**
   * Return to the parent builder.
   */
  done(): TParent {
    return this.parent;
  }
}
