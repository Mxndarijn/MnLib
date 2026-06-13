import {TemplateRef, Type} from '@angular/core';
import {Observable} from 'rxjs';
import {ValidatorFn, AsyncValidatorFn} from '@angular/forms';
import {TableDataSource} from '../mn-table/mn-table.types';

export { Type, TemplateRef };

// =========================
// Enums / Value Types
// =========================

export enum ModalKind {
  WIZARD = 'wizard',
  FORM = 'form',
  CONFIRMATION = 'confirmation',
  CUSTOM = 'custom',
}

export enum ModalSize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
  FULL = 'full',
}

export enum CloseMode {
  ALLOWED = 'allowed',
  GUARDED = 'guarded',
  DISABLED = 'disabled',
}

export enum BackdropMode {
  HIDE = 'hide',
  STATIC = 'static',
  CLOSABLE = 'closable',
}

export enum KeyboardMode {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

export enum ModalIntent {
  NEUTRAL = 'neutral',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  DANGER = 'danger',
}

export enum WizardFlowMode {
  LINEAR = 'linear',
  FREE = 'free',
}

export enum FormLayoutMode {
  SINGLE_COLUMN = 'single-column',
  TWO_COLUMN = 'two-column',
  INLINE = 'inline',
}

export enum SubmitMode {
  ONCE = 'once',
  RETRYABLE = 'retryable',
}

export enum ConfirmationTone {
  DEFAULT = 'default',
  WARNING = 'warning',
  DANGER = 'danger',
}

export enum FieldKind {
  TEXT = 'text',
  NUMBER = 'number',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  DATE = 'date',
  TEXTAREA = 'textarea',
  DATETIME = 'datetime',
  MULTI_SELECT = 'multi-select',
  MULTI_SELECT_TABLE = 'multi-select-table',
  SINGLE_SELECT_TABLE = 'single-select-table',
  PASSWORD = 'password',
  FILE = 'file',
  COLOR = 'color',
  RATING = 'rating',
  SLIDER = 'slider',
  CUSTOM = 'custom',
}

export enum FieldAppearance {
  OUTLINE = 'outline',
  FILLED = 'filled',
  GHOST = 'ghost',
}

export enum SelectionMode {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

export enum OptionState {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

export enum ActionStyle {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  DANGER = 'danger',
  GHOST = 'ghost',
}

export enum StepState {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETE = 'complete',
  DISABLED = 'disabled',
  HIDDEN = 'hidden',
}

export enum NavigationDirection {
  FORWARD = 'forward',
  BACKWARD = 'backward',
  DIRECT = 'direct',
}

export enum ModalCloseReason {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISMISSED = 'dismissed',
  BACKDROP = 'backdrop',
  ESCAPE = 'escape',
  PROGRAMMATIC = 'programmatic',
  GUARD_REJECTED = 'guard_rejected',
}

export enum ValidationStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  PENDING = 'pending',
}

export enum ValidationCode {
  REQUIRED = 'required',
  MIN = 'min',
  MAX = 'max',
  PATTERN = 'pattern',
  CUSTOM = 'custom',
}

// =========================
// Value Objects & Types
// =========================

export type ModalStepId = string;
export type ModalInputMap = Record<string, unknown>;

// =========================
// Conditional Field Types
// =========================

/**
 * A condition function that receives the current form values and returns
 * whether the field should be visible.
 */
export type FieldVisibilityCondition<TModel = unknown> = (formValue: Partial<TModel>) => boolean;

/**
 * A condition function that receives the current form values and returns
 * whether the field should be required.
 */
export type FieldRequiredCondition<TModel = unknown> = (formValue: Partial<TModel>) => boolean;

// =========================
// Cross-Field Validation
// =========================

/**
 * A form-level validator that receives the entire form value
 * and returns an error map or null.
 */
export type FormValidator<TModel = unknown> = (formValue: Partial<TModel>) => Record<string, string> | null;

// =========================
// Async DataSource Types
// =========================

/**
 * A data source that asynchronously loads options for select/multi-select fields.
 * Can optionally depend on other field values to reload.
 */
export type FieldDataSource<TValue = unknown, TModel = unknown> = {
  /** Load options, optionally based on current form values */
  load(formValue?: Partial<TModel>): Promise<SelectOption<TValue>[]> | SelectOption<TValue>[];
  /** Keys of other fields that trigger a reload when their value changes */
  dependsOn?: (keyof TModel)[];
}

// =========================
// Validation Types
// =========================

export type ValidationResult = {
  status: ValidationStatus;
  code?: ValidationCode;
  message?: string;
}

export type StepValidator = {
  validate(): Promise<ValidationResult> | ValidationResult;
}

export type FieldValidator = {
  validate(value: unknown): Promise<ValidationResult> | ValidationResult;
}

export type StepGuard = {
  canEnter(): Promise<boolean> | boolean;
  canExit(): Promise<boolean> | boolean;
}

// =========================
// Modal Result & Events
// =========================

export type ModalCloseEvent<TResult = unknown> = {
  reason: ModalCloseReason;
  result?: TResult;
}

export type ModalRef<TResult = unknown> = {
  afterClosed$: Observable<ModalCloseEvent<TResult>>;
  close(result?: TResult): void;
  dismiss(reason: ModalCloseReason): void;
  update(config: Partial<BaseModalConfig<TResult>>): void;
}

// =========================
// Handlers
// =========================

export type ModalResultHandler<TResult = unknown> = {
  handle(result: TResult): Promise<void> | void;
}

export type WizardStepChangeEvent = {
  previousStepId?: ModalStepId;
  currentStepId: ModalStepId;
  direction: NavigationDirection;
}

export type WizardStepChangeHandler = {
  handle(event: WizardStepChangeEvent): Promise<void> | void;
}

// =========================
// Wizard Types
// =========================

export type StepBodyConfig = Type<unknown> | TemplateRef<unknown> | string;

export type WizardStepConfig<TModel = unknown> = {
  id: ModalStepId;
  title: string;
  state?: StepState;
  body?: StepBodyConfig;
  fields?: FormFieldConfig<TModel>[];
  rows?: FormRow<TModel>[];
  fieldGroups?: FormFieldGroup<TModel>[];
  formValidators?: FormValidator<TModel>[];
  groupValidators?: ValidatorFn[];
  initialValue?: Partial<TModel>;
  guard?: StepGuard;
  validators?: StepValidator[];
  /** Custom label for the 'Next' button on this step */
  nextLabel?: string;
  /** Custom label for the 'Back' button on this step */
  backLabel?: string;
  /** Whether to hide the 'Back' button on this step */
  hideBack?: boolean;
  /** Condition to show/hide this entire step based on aggregated wizard data */
  visible?: (aggregatedData: Record<ModalStepId, Record<string, unknown>>) => boolean;
}

export type WizardResult = {
  status: ModalCloseReason;
  visitedStepIds: ModalStepId[];
  payload?: Record<ModalStepId, Record<string, unknown>>;
}

// =========================
// Form Types
// =========================

type KeyOf<T> = unknown extends T ? string : keyof T & string;

export type SelectOption<TValue = unknown> = {
  label: string;
  value: TValue;
  state?: OptionState;
}

export type TextFieldConfig<TModel = unknown> = {
  kind: FieldKind.TEXT;
  key: KeyOf<TModel>;
  label: string;
  appearance?: FieldAppearance;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  placeholder?: string;
  /** Whether this field is read-only (display only) */
  readOnly?: boolean;
  /** Whether this field is disabled */
  disabled?: boolean;
  /** Condition to show/hide this field based on other field values */
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  /** Input mask (e.g., '(000) 000-0000') */
  mask?: string;
  /** Autocomplete attribute */
  autocomplete?: string;
  /** Whether to focus this field when the modal opens */
  autoFocus?: boolean;
  /** When to update the form control value and run validation */
  updateOn?: 'change' | 'blur' | 'submit';
}

export type NumberFieldConfig<TModel = unknown> = {
  kind: FieldKind.NUMBER;
  key: KeyOf<TModel>;
  label: string;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type SelectFieldConfig<TModel = unknown, TValue = unknown> = {
  kind: FieldKind.SELECT;
  key: KeyOf<TModel>;
  label: string;
  options: SelectOption<TValue>[];
  selectionMode?: SelectionMode;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
  /** Async data source for loading options dynamically */
  dataSource?: FieldDataSource<TValue, TModel>;
}

export type CheckboxFieldConfig<TModel = unknown> = {
  kind: FieldKind.CHECKBOX;
  key: KeyOf<TModel>;
  label: string;
  defaultValue?: boolean;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type DateFieldConfig<TModel = unknown> = {
  kind: FieldKind.DATE;
  key: KeyOf<TModel>;
  label: string;
  placeholder?: string;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  minDate?: string;
  maxDate?: string;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type TextareaFieldConfig<TModel = unknown> = {
  kind: FieldKind.TEXTAREA;
  key: KeyOf<TModel>;
  label: string;
  placeholder?: string;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  rows?: number;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type DatetimeFieldConfig<TModel = unknown> = {
  kind: FieldKind.DATETIME;
  key: KeyOf<TModel>;
  label: string;
  placeholder?: string;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  mode?: 'date' | 'time' | 'datetime-local';
  min?: string;
  max?: string;
  step?: number;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type MultiSelectFieldConfig<TModel = unknown, TValue = unknown> = {
  kind: FieldKind.MULTI_SELECT;
  key: KeyOf<TModel>;
  label: string;
  options: SelectOption<TValue>[];
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  searchable?: boolean;
  searchPlaceholder?: string;
  maxSelections?: number;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
  /** Async data source for loading options dynamically */
  dataSource?: FieldDataSource<TValue, TModel>;
}

export type PasswordFieldConfig<TModel = unknown> = {
  kind: FieldKind.PASSWORD;
  key: KeyOf<TModel>;
  label: string;
  placeholder?: string;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type MultiSelectTableFieldConfig<TModel = unknown, TRow = unknown> = {
  kind: FieldKind.MULTI_SELECT_TABLE;
  key: KeyOf<TModel>;
  label: string;
  /** The TableDataSource that powers the mn-table. selectionMode will be forced to 'multi'. */
  tableDataSource: TableDataSource<TRow>;
  /** Function to extract the value stored in the form from a selected row (default: getID) */
  getRowValue?: (row: TRow) => unknown;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type SingleSelectTableFieldConfig<TModel = unknown, TRow = unknown> = {
  kind: FieldKind.SINGLE_SELECT_TABLE;
  key: KeyOf<TModel>;
  label: string;
  /** The TableDataSource that powers the mn-table. selectionMode will be forced to 'single'. */
  tableDataSource: TableDataSource<TRow>;
  /** Function to extract the value stored in the form from a selected row (default: getID) */
  getRowValue?: (row: TRow) => unknown;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type ColorFieldConfig<TModel = unknown> = {
  kind: FieldKind.COLOR;
  key: KeyOf<TModel>;
  label: string;
  /** Default color value (hex string, e.g., '#ff0000') */
  defaultValue?: string;
  /** Predefined color swatches to show */
  swatches?: string[];
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type RatingFieldConfig<TModel = unknown> = {
  kind: FieldKind.RATING;
  key: KeyOf<TModel>;
  label: string;
  /** Maximum rating value (default: 5) */
  max?: number;
  /** Icon to use for rating (default: 'star') */
  icon?: 'star' | 'heart' | 'circle';
  /** Allow half-star ratings (default: false) */
  allowHalf?: boolean;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type SliderFieldConfig<TModel = unknown> = {
  kind: FieldKind.SLIDER;
  key: KeyOf<TModel>;
  label: string;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Step increment (default: 1) */
  step?: number;
  /** Whether to show the current value label (default: true) */
  showValue?: boolean;
  /** Unit label displayed after the value (e.g., '%', 'px') */
  unit?: string;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type FileFieldConfig<TModel = unknown> = {
  kind: FieldKind.FILE;
  key: KeyOf<TModel>;
  label: string;
  /** Accepted file types (e.g., '.pdf,.jpg,image/*') */
  accept?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files (when multiple is true) */
  maxFiles?: number;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type CustomFieldConfig<TModel = unknown> = {
  kind: FieldKind.CUSTOM;
  key: KeyOf<TModel>;
  component: Type<unknown>;
  inputs?: ModalInputMap;
  label?: string;
  validators?: ValidatorFn[];
  asyncValidators?: AsyncValidatorFn[];
  visible?: FieldVisibilityCondition<TModel>;
  /** Condition to dynamically mark this field as required based on other field values */
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  updateOn?: 'change' | 'blur' | 'submit';
}

export type FormFieldConfig<TModel = unknown> =
  | TextFieldConfig<TModel>
  | NumberFieldConfig<TModel>
  | SelectFieldConfig<TModel>
  | CheckboxFieldConfig<TModel>
  | DateFieldConfig<TModel>
  | TextareaFieldConfig<TModel>
  | DatetimeFieldConfig<TModel>
  | MultiSelectFieldConfig<TModel>
  | MultiSelectTableFieldConfig<TModel, unknown>
  | SingleSelectTableFieldConfig<TModel, unknown>
  | PasswordFieldConfig<TModel>
  | FileFieldConfig<TModel>
  | ColorFieldConfig<TModel>
  | RatingFieldConfig<TModel>
  | SliderFieldConfig<TModel>
  | CustomFieldConfig<TModel>;

export type AnimationOptions = {
  type: 'slide' | 'fade' | 'zoom';
  duration?: number; // ms
}

// =========================
// Form Layout Types
// =========================

export type FormRowField<TModel = unknown> = {
  field: FormFieldConfig<TModel>;
  span?: number; // Number of columns this field spans (default: 1)
}

export type FormRow<TModel = unknown> = {
  columns?: number; // Number of columns in this row (default: 1 = full width)
  fields: FormRowField<TModel>[];
}

// =========================
// Field Group / Section Types
// =========================

export type FormFieldGroup<TModel = unknown> = {
  /** Section header title */
  title: string;
  /** Optional description below the section header */
  description?: string;
  /** Fields in this group */
  fields: FormFieldConfig<TModel>[];
  /** Optional rows layout for this group */
  rows?: FormRow<TModel>[];
  /** Condition to show/hide this entire group based on form values */
  visible?: FieldVisibilityCondition<TModel>;
}

// =========================
// Action Types
// =========================

export type ConfirmationActionConfig<TResult = unknown> = {
  label: string;
  style?: ActionStyle;
  handler?: ModalResultHandler<TResult>;
}

export type CancellationActionConfig = {
  label: string;
  style?: ActionStyle;
  reason?: ModalCloseReason;
}

// =========================
// Footer Action Types
// =========================

export type ModalFooterAction<TResult = unknown> = {
  label: string;
  style?: ActionStyle;
  /** Position in the footer: 'left' or 'right' (default: 'right') */
  position?: 'left' | 'right';
  /** Whether this action closes the modal */
  closesModal?: boolean;
  /** Close reason when this action closes the modal */
  closeReason?: ModalCloseReason;
  /** Handler called when the action is clicked */
  handler?: (modalRef: ModalRef<TResult>) => Promise<void> | void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

// =========================
// Polling / Async Types
// =========================

export type ModalPollingConfig<TResult = unknown> = {
  /** Polling interval in milliseconds */
  interval: number;
  /** Function called on each poll tick */
  onPoll: (modalRef: ModalRef<TResult>) => Promise<boolean | void> | boolean | void;
  /** Whether to start polling immediately (default: true) */
  autoStart?: boolean;
  /** Maximum number of poll attempts (undefined = unlimited) */
  maxAttempts?: number;
}

// =========================
// Base Config
// =========================

// =========================
// i18n / Localization
// =========================

export type ModalI18nLabels = {
  /** Submit button label (default: 'Submit') */
  submit?: string;
  /** Cancel button label (default: 'Cancel') */
  cancel?: string;
  /** Next button label for wizard (default: 'Next') */
  next?: string;
  /** Back button label for wizard (default: 'Back') */
  back?: string;
  /** Close button label (default: 'Close') */
  close?: string;
  /** Complete button label for wizard (default: 'Complete') */
  complete?: string;
  /** Submitting state label (default: 'Submitting...') */
  submitting?: string;
  /** Completing state label (default: 'Completing...') */
  completing?: string;
  /** Loading label (default: 'Loading...') */
  loading?: string;
  /** Select placeholder (default: 'Select...') */
  selectPlaceholder?: string;
  /** File upload prompt (default: 'Click or drag files here') */
  fileUploadPrompt?: string;
  /** Confirm button label (default: 'Confirm') */
  confirm?: string;
}

// =========================
// Cancel / Dismiss Handler
// =========================

export type ModalCancelHandler<_TResult = unknown> = (reason: ModalCloseReason) => Promise<void> | void;

export type BaseModalConfig<TResult = unknown> = {
  kind: ModalKind;
  title?: string;
  subtitle?: string;
  description?: string;
  /** Width of the modal (uses ModalSize enum) */
  sizeWidth?: ModalSize;
  /** Height of the modal (uses ModalSize enum) */
  sizeHeight?: ModalSize;
  closeMode?: CloseMode;
  closeGuard?: () => Promise<boolean> | boolean;
  backdrop?: BackdropMode;
  keyboard?: KeyboardMode;
  intent?: ModalIntent;
  resultType?: TResult;
  /** Custom footer actions (overrides default footer) */
  footerActions?: ModalFooterAction<TResult>[];
  /** Polling configuration for periodic async operations */
  polling?: ModalPollingConfig<TResult>;
  /** Handler called when the modal is cancelled or dismissed */
  readOnly?: boolean;
  disabled?: boolean;
  onCancel?: ModalCancelHandler<TResult>;
  /** i18n labels for buttons and UI text */
  i18n?: ModalI18nLabels;
  /** Animation configuration */
  animation?: AnimationOptions | AnimationOptions['type'];

  /** Custom component to render in the modal body */
  component?: Type<unknown>;
  /** Custom template to render in the modal body */
  template?: TemplateRef<unknown>;
  /** Inputs for the custom component */
  inputs?: ModalInputMap;
}

// =========================
// Specialized Configs
// =========================

export type WizardBeforeCompleteValidator<TResult = unknown> = (
  payload: Record<ModalStepId, Record<string, unknown>>
) => Promise<Partial<Record<keyof TResult & string, string>> | null> | Partial<Record<keyof TResult & string, string>> | null;

export type WizardModalConfig<TResult = WizardResult> = {
  kind: ModalKind.WIZARD;
  steps: WizardStepConfig[];
  startStepId?: ModalStepId;
  flow?: WizardFlowMode;
  onStepChange?: WizardStepChangeHandler;
  onComplete?: ModalResultHandler<TResult>;
  /** Cross-step validators run before wizard completion */
  onBeforeComplete?: WizardBeforeCompleteValidator<TResult>[];
  /** Global initial values for all steps */
  initialValue?: Partial<TResult>;
} & BaseModalConfig<TResult>

export type FormModalConfig<TModel = unknown, TResult = TModel> = {
  kind: ModalKind.FORM;
  body?: StepBodyConfig;
  fields: FormFieldConfig<TModel>[];
  rows?: FormRow<TModel>[];
  layout?: FormLayoutMode;
  initialValue?: Partial<TModel>;
  submitMode?: SubmitMode;
  onComplete?: ModalResultHandler<TResult>;
  /** Form-level validators for cross-field validation */
  formValidators?: FormValidator<TModel>[];
  /** Angular FormGroup-level validators (e.g., Validators.required on the group) */
  groupValidators?: ValidatorFn[];
  /** Field groups with section headers */
  fieldGroups?: FormFieldGroup<TModel>[];
} & BaseModalConfig<TResult>

export type ConfirmationModalConfig<TResult = boolean> = {
  kind: ModalKind.CONFIRMATION;
  message: string;
  tone?: ConfirmationTone;
  confirm?: ConfirmationActionConfig<TResult>;
  cancel?: CancellationActionConfig;

  // Form-like capabilities for hybrid confirmation modals
  body?: StepBodyConfig;
  fields?: FormFieldConfig<unknown>[];
  rows?: FormRow<unknown>[];
  fieldGroups?: FormFieldGroup<unknown>[];
  formValidators?: FormValidator<unknown>[];
  groupValidators?: ValidatorFn[];
  initialValue?: Partial<unknown>;
} & BaseModalConfig<TResult>

export type CustomModalConfig<TResult = unknown> = {
  kind: ModalKind.CUSTOM;
  onComplete?: ModalResultHandler<TResult>;
} & BaseModalConfig<TResult>

// =========================
// Union Root Config
// =========================

export type ModalConfig<TResult = unknown, TModel = unknown> =
  | WizardModalConfig<TResult>
  | FormModalConfig<TModel, TResult>
  | ConfirmationModalConfig<TResult>
  | CustomModalConfig<TResult>;
