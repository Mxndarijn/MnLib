import { WizardModalBuilder } from './wizard-modal.builder';
import { FormModalBuilder } from './form-modal.builder';
import { ConfirmationModalBuilder } from './confirmation-modal.builder';
import { CustomModalBuilder } from './custom-modal.builder';
import {WizardResult} from '../mn-modal.types';

export class ModalBuilder {
  static wizard<TResult = WizardResult>(): WizardModalBuilder<TResult> {
    return new WizardModalBuilder<TResult>();
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
