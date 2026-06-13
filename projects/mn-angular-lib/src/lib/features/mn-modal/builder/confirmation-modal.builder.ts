import { BaseModalBuilder } from './base-modal.builder';
import {
  ConfirmationModalConfig,
  ModalKind,
  ConfirmationTone,
  ConfirmationActionConfig,
  CancellationActionConfig,
  FormValidator,
} from '../mn-modal.types';
import {ValidatorFn} from '@angular/forms';

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

  initialValue(value: Partial<unknown>): this {
    return this.layoutBuilder.initialValue(value);
  }

  formValidators(validators: FormValidator<unknown>[]): this {
    return this.layoutBuilder.formValidators(validators);
  }

  override groupValidators(validators: ValidatorFn[]): this {
    return this.layoutBuilder.groupValidators(validators);
  }

  override build(): Readonly<ConfirmationModalConfig<TResult>> {
    return super.build();
  }
}
