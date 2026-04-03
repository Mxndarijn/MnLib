import {
  BaseModalConfig,
  ModalSize,
  CloseMode,
  BackdropMode,
  KeyboardMode,
  ModalIntent,
  ModalFooterAction,
  ModalPollingConfig,
  ModalCancelHandler,
  ModalI18nLabels,
} from '../mn-modal.types';

export abstract class BaseModalBuilder<TConfig extends BaseModalConfig<TResult>, TResult = unknown> {
  protected config: TConfig;

  protected constructor(initialConfig: TConfig) {
    this.config = initialConfig;
  }

  title(title: string): this {
    this.config.title = title;
    return this;
  }

  subtitle(subtitle: string): this {
    this.config.subtitle = subtitle;
    return this;
  }

  description(description: string): this {
    this.config.description = description;
    return this;
  }

  closeGuard(guard: () => Promise<boolean> | boolean): this {
    this.config.closeGuard = guard;
    return this;
  }

  size(size: ModalSize): this {
    this.config.size = size;
    return this;
  }

  closeMode(mode: CloseMode): this {
    this.config.closeMode = mode;
    return this;
  }

  backdrop(mode: BackdropMode): this {
    this.config.backdrop = mode;
    return this;
  }

  keyboard(mode: KeyboardMode): this {
    this.config.keyboard = mode;
    return this;
  }

  intent(intent: ModalIntent): this {
    this.config.intent = intent;
    return this;
  }

  footerActions(actions: ModalFooterAction<TResult>[]): this {
    this.config.footerActions = actions;
    return this;
  }

  polling(config: ModalPollingConfig<TResult>): this {
    this.config.polling = config;
    return this;
  }

  onCancel(handler: ModalCancelHandler<TResult>): this {
    this.config.onCancel = handler;
    return this;
  }

  i18n(labels: ModalI18nLabels): this {
    this.config.i18n = labels;
    return this;
  }

  build(): Readonly<TConfig> {
    return Object.freeze({ ...this.config });
  }
}
