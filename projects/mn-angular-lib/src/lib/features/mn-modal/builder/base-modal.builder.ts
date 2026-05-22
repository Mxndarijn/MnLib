import { FormLayoutBuilder, FieldValidatorBuilder } from './form-layout.builder';
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
  Type,
  TemplateRef,
  ModalInputMap,
  FormFieldConfig,
  FormFieldGroup,
  AnimationOptions,
} from '../mn-modal.types';

export abstract class BaseModalBuilder<TConfig extends BaseModalConfig<TResult>, TResult = unknown> {
  protected config: TConfig;
  protected layoutBuilder: FormLayoutBuilder<any, this>;

  protected constructor(initialConfig: TConfig) {
    this.config = initialConfig;
    // Base layout builder, we pass this.config directly if it supports it
    this.layoutBuilder = new FormLayoutBuilder(this.config as any, this);
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

  /** Set the width of the modal */
  sizeWidth(size: ModalSize): this {
    this.config.sizeWidth = size;
    return this;
  }

  /** Set the height of the modal (e.g. '400px', '50vh', '90vh') */
  sizeHeight(height: string): this {
    this.config.sizeHeight = height;
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

  readOnly(readOnly: boolean = true): this {
    this.config.readOnly = readOnly;
    return this;
  }

  disabled(disabled: boolean = true): this {
    this.config.disabled = disabled;
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

  animation(animation: AnimationOptions | AnimationOptions['type']): this {
    this.config.animation = animation;
    return this;
  }

  /**
   * Add a custom body/content to the modal.
   */
  body(body: any): this {
    return this.layoutBuilder.body(body);
  }

  /**
   * Add a field.
   */
  field(field: FormFieldConfig<any>): this {
    return this.layoutBuilder.field(field);
  }

  /**
   * Add a field with a fluent validation builder.
   */
  fieldWithValidators(field: FormFieldConfig<any>): FieldValidatorBuilder<any, this> {
    return this.layoutBuilder.fieldWithValidators(field);
  }

  /**
   * Start a new row.
   */
  row(columns: number = 2): this {
    return this.layoutBuilder.row(columns);
  }

  /**
   * Add a field to the current row.
   */
  addToRow(field: FormFieldConfig<any>, span: number = 1): this {
    return this.layoutBuilder.addToRow(field, span);
  }

  /**
   * Declarative way to add a row.
   */
  addRow(
    columns: number,
    buildFn: (row: { add: (field: FormFieldConfig<any>, span?: number) => void }) => void
  ): this {
    return this.layoutBuilder.addRow(columns, buildFn);
  }

  /**
   * Add a field group.
   */
  fieldGroup(group: FormFieldGroup<any>): this;
  fieldGroup(
    title: string,
    buildFn: (group: FormLayoutBuilder<any, any>) => void
  ): this;
  fieldGroup(
    title: string,
    description: string,
    buildFn: (group: FormLayoutBuilder<any, any>) => void
  ): this;
  fieldGroup(
    arg1: string | FormFieldGroup<any>,
    arg2?: string | ((group: FormLayoutBuilder<any, any>) => void),
    arg3?: (group: FormLayoutBuilder<any, any>) => void
  ): this {
    return this.layoutBuilder.fieldGroup(arg1 as any, arg2 as any, arg3 as any);
  }

  build(): Readonly<TConfig> {
    this.layoutBuilder.flushCurrentRow();
    return Object.freeze({ ...this.config });
  }
}
