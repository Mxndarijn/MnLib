import { BaseModalBuilder } from './base-modal.builder';
import { FormLayoutBuilder, FieldValidatorBuilder } from './form-layout.builder';
import {
  FormModalConfig,
  ModalKind,
  FormFieldConfig,
  FormFieldGroup,
  FormLayoutMode,
  SubmitMode,
  ModalResultHandler,
  FormValidator,
} from '../mn-modal.types';

export class FormModalBuilder<TModel = unknown, TResult = TModel> extends BaseModalBuilder<
  FormModalConfig<TModel, TResult>,
  TResult
> {
  constructor() {
    super({
      kind: ModalKind.FORM,
      fields: [],
      rows: [],
    });
  }

  override body(body: any): this {
    return super.body(body);
  }

  override field(field: FormFieldConfig<TModel>): this {
    return super.field(field);
  }

  override row(columns: number = 2): this {
    return super.row(columns);
  }

  override addToRow(field: FormFieldConfig<TModel>, span: number = 1): this {
    return super.addToRow(field, span);
  }

  override addRow(
    columns: number,
    buildFn: (row: { add: (field: FormFieldConfig<TModel>, span?: number) => void }) => void
  ): this {
    return super.addRow(columns, buildFn as any);
  }

  layout(mode: FormLayoutMode): this {
    this.config.layout = mode;
    return this;
  }

  initialValue(value: Partial<TModel>): this {
    return this.layoutBuilder.initialValue(value);
  }

  submitMode(mode: SubmitMode): this {
    this.config.submitMode = mode;
    return this;
  }

  onComplete(handler: ModalResultHandler<TResult>): this {
    this.config.onComplete = handler;
    return this;
  }

  formValidators(validators: FormValidator<TModel>[]): this {
    return this.layoutBuilder.formValidators(validators);
  }

  groupValidators(validators: any[]): this {
    return this.layoutBuilder.groupValidators(validators);
  }

  /**
   * Add a field group with a section header.
   * Groups visually separate fields with a title and optional description.
   */
  override fieldGroup(group: FormFieldGroup<TModel>): this;
  /**
   * Add a field group using a functional builder.
   */
  override fieldGroup(
    title: string,
    buildFn: (group: FormLayoutBuilder<TModel, any>) => void
  ): this;
  /**
   * Add a field group with title, description, and a functional builder.
   */
  override fieldGroup(
    title: string,
    description: string,
    buildFn: (group: FormLayoutBuilder<TModel, any>) => void
  ): this;
  override fieldGroup(
    arg1: string | FormFieldGroup<TModel>,
    arg2?: string | ((group: FormLayoutBuilder<TModel, any>) => void),
    arg3?: (group: FormLayoutBuilder<TModel, any>) => void
  ): this {
    return super.fieldGroup(arg1 as any, arg2 as any, arg3 as any);
  }

  override build(): Readonly<FormModalConfig<TModel, TResult>> {
    return super.build() as any;
  }
}
