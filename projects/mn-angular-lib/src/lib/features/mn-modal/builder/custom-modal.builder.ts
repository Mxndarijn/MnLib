import { Type, TemplateRef } from '@angular/core';
import { BaseModalBuilder } from './base-modal.builder';
import {
  CustomModalConfig,
  ModalKind,
  ModalInputMap,
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

  component(component: Type<unknown>): this {
    this.config.component = component;
    return this;
  }

  template(template: TemplateRef<unknown>): this {
    this.config.template = template;
    return this;
  }

  inputs(inputs: ModalInputMap): this {
    this.config.inputs = inputs;
    return this;
  }

  onComplete(handler: ModalResultHandler<TResult>): this {
    this.config.onComplete = handler;
    return this;
  }
}
