import { BaseModalBuilder } from './base-modal.builder';
import { FormLayoutBuilder } from './form-layout.builder';
import {
  ConfirmationModalConfig,
  ModalKind,
  ConfirmationTone,
  ConfirmationActionConfig,
  CancellationActionConfig,
  FormFieldConfig,
  FormFieldGroup,
  FormValidator,
} from '../mn-modal.types';

export class ConfirmationModalBuilder<TResult = boolean> extends BaseModalBuilder<
  ConfirmationModalConfig<TResult>,
  TResult
> {
  constructor() {
    super({
      kind: ModalKind.CONFIRMATION,
      message: '',
      fields: [],
      rows: [],
    });
  }

  message(text: string): this {
    this.config.message = text;
    return this;
  }

  tone(tone: ConfirmationTone): this {
    this.config.tone = tone;
    return this;
  }

  confirmAction(action: ConfirmationActionConfig<TResult>): this {
    this.config.confirm = action;
    return this;
  }

  cancelAction(action: CancellationActionConfig): this {
    this.config.cancel = action;
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

  initialValue(value: Partial<any>): this {
    return this.layoutBuilder.initialValue(value);
  }

  formValidators(validators: FormValidator<any>[]): this {
    return this.layoutBuilder.formValidators(validators);
  }

  groupValidators(validators: any[]): this {
    return this.layoutBuilder.groupValidators(validators);
  }

  override build(): Readonly<ConfirmationModalConfig<TResult>> {
    return super.build() as any;
  }
}
