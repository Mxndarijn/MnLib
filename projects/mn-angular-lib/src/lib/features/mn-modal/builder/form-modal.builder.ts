import { BaseModalBuilder } from './base-modal.builder';
import {
  FormModalConfig,
  ModalKind,
  FormFieldConfig,
  FormLayoutMode,
  SubmitMode,
  ModalResultHandler,
  FormValidator,
  MultiSelectTableFieldConfig,
  SingleSelectTableFieldConfig,
} from '../mn-modal.types';
import {ValidatorFn} from '@angular/forms';

export class FormModalBuilder<TModel = unknown, TResult = TModel> extends BaseModalBuilder<
  FormModalConfig<TModel, TResult>,
  TResult,
  TModel
> {
  constructor() {
    super({
      kind: ModalKind.FORM,
      fields: [],
      rows: [],
    });
  }

  /**
   * Override to also accept table field configs with a concrete TRow (BehaviorSubject is invariant,
   * so TableDataSource<TeamMember> is not assignable to TableDataSource<unknown>).
   */
  override field(field: FormFieldConfig<TModel>): this;
  override field<TRow>(field: MultiSelectTableFieldConfig<TModel, TRow> | SingleSelectTableFieldConfig<TModel, TRow>): this;
  override field<TRow = unknown>(
    field: FormFieldConfig<TModel> | MultiSelectTableFieldConfig<TModel, TRow> | SingleSelectTableFieldConfig<TModel, TRow>
  ): this {
    return super.field(field as FormFieldConfig<TModel>);
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

  override groupValidators(validators: ValidatorFn[]): this {
    return this.layoutBuilder.groupValidators(validators);
  }

  override build(): Readonly<FormModalConfig<TModel, TResult>> {
    return super.build();
  }
}
