import { BaseModalBuilder } from './base-modal.builder';
import {
  ConfirmationModalConfig,
  ModalKind,
  ConfirmationTone,
  ConfirmationActionConfig,
  CancellationActionConfig,
} from '../mn-modal.types';

export class ConfirmationModalBuilder<TResult = boolean> extends BaseModalBuilder<
  ConfirmationModalConfig<TResult>,
  TResult
> {
  constructor() {
    super({
      kind: ModalKind.CONFIRMATION,
      message: '',
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
}
