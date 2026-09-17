import { BaseModalBuilder } from './base-modal.builder';
import {
  CustomModalConfig,
  ModalKind,
  ModalResultHandler,
} from '../mn-modal.types';

export class CustomModalBuilder<TResult = unknown> extends BaseModalBuilder<
  CustomModalConfig<TResult>,
  TResult
> {
  constructor() {
    super({
      kind: ModalKind.CUSTOM,
    });
  }

  onComplete(handler: ModalResultHandler<TResult>): this {
    this.config.onComplete = handler;
    return this;
  }
}
