import { WizardModalBuilder } from './wizard-modal.builder';
import { FormModalBuilder } from './form-modal.builder';
import { ConfirmationModalBuilder } from './confirmation-modal.builder';
import { CustomModalBuilder } from './custom-modal.builder';

export class ModalBuilder {
  static wizard(): WizardModalBuilder {
    return new WizardModalBuilder();
  }

  static form<TModel = unknown, TResult = TModel>(): FormModalBuilder<TModel, TResult> {
    return new FormModalBuilder<TModel, TResult>();
  }

  static confirmation<TResult = boolean>(): ConfirmationModalBuilder<TResult> {
    return new ConfirmationModalBuilder<TResult>();
  }

  static custom<TResult = unknown>(): CustomModalBuilder<TResult> {
    return new CustomModalBuilder<TResult>();
  }
}
