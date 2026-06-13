import {
  ChainableGroupBuilder,
  FieldValidatorBuilder,
  FormContainerConfig,
  FormLayoutBuilder
} from './form-layout.builder';
import {
  AnimationOptions,
  BackdropMode,
  BaseModalConfig,
  CloseMode,
  FormFieldConfig,
  FormFieldGroup,
  KeyboardMode,
  ModalCancelHandler,
  ModalFooterAction,
  ModalI18nLabels,
  ModalInputMap,
  ModalIntent,
  ModalPollingConfig,
  ModalSize,
  StepBodyConfig,
  TemplateRef,
  Type,
} from '../mn-modal.types';
import {ValidatorFn} from '@angular/forms';

export abstract class BaseModalBuilder<TConfig extends BaseModalConfig<TResult> & FormContainerConfig<TModel>, TResult = unknown, TModel = unknown> {
  protected config: TConfig;
  protected layoutBuilder: FormLayoutBuilder<TModel, this>;

  protected constructor(initialConfig: TConfig) {
    this.config = initialConfig;
    this.layoutBuilder = new FormLayoutBuilder<TModel, this>(
      this.config,
      this
    );
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

  /** Set the height of the modal */
  sizeHeight(size: ModalSize): this {
    this.config.sizeHeight = size;
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

  readOnly(readOnly = true): this {
    this.config.readOnly = readOnly;
    return this;
  }

  disabled(disabled = true): this {
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
  body(body: StepBodyConfig): this {
    return this.layoutBuilder.body(body);
  }

  /**
   * Add a field.
   */
  field(field: FormFieldConfig<TModel>): this {
    return this.layoutBuilder.field(field);
  }

  /**
   * Add a field with a fluent validation builder.
   */
  fieldWithValidators(field: FormFieldConfig<TModel>): FieldValidatorBuilder<TModel, this> {
    return this.layoutBuilder.fieldWithValidators(field);
  }

  /**
   * Start a new row.
   */
  row(columns = 2): this {
    return this.layoutBuilder.row(columns);
  }

  /**
   * Add a field to the current row.
   */
  addToRow(field: FormFieldConfig<TModel>, span = 1): this {
    return this.layoutBuilder.addToRow(field, span);
  }

  /**
   * Declarative way to add a row.
   */
  addRow(
    columns: number,
    buildFn: (row: { add: (field: FormFieldConfig<TModel>, span?: number) => void }) => void
  ): this {
    return this.layoutBuilder.addRow(columns, buildFn);
  }

  /**
   * Add a field group.
   */
  fieldGroup(group: FormFieldGroup<TModel>): this;
  fieldGroup(title: string, buildFn: (group: ChainableGroupBuilder<TModel>) => void): this;
  fieldGroup(title: string, description: string, buildFn: (group: ChainableGroupBuilder<TModel>) => void): this;
  fieldGroup(
    arg1: string | FormFieldGroup<TModel>,
    arg2?: string | ((group: ChainableGroupBuilder<TModel>) => void),
    arg3?: (group: ChainableGroupBuilder<TModel>) => void
  ): this {
    if (typeof arg1 !== 'string') {
      return this.layoutBuilder.fieldGroup(arg1);
    }
    if (typeof arg2 === 'string') {
      return this.layoutBuilder.fieldGroup(arg1, arg2, arg3!);
    }
    return this.layoutBuilder.fieldGroup(arg1, arg2!);
  }

  groupValidators(validators: ValidatorFn[]): this {
    return this.layoutBuilder.groupValidators(validators);
  }

  build(): Readonly<TConfig> {
    this.layoutBuilder.flushCurrentRow();
    return Object.freeze({ ...this.config });
  }
}
