import { Type, TemplateRef } from '@angular/core';
export { Type, TemplateRef };
import { Observable } from 'rxjs';
import { TableDataSource } from '../mn-table/mn-table.types';

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
export type FieldVisibilityCondition<TModel = any> = (formValue: Partial<TModel>) => boolean;

// =========================
// Cross-Field Validation
// =========================

/**
 * A form-level validator that receives the entire form value
 * and returns an error map or null.
 */
export type FormValidator<TModel = any> = (formValue: Partial<TModel>) => Record<string, string> | null;

// =========================
// Async DataSource Types
// =========================

/**
 * A data source that asynchronously loads options for select/multi-select fields.
 * Can optionally depend on other field values to reload.
 */
export interface FieldDataSource<TValue = unknown, TModel = any> {
  /** Load options, optionally based on current form values */
  load(formValue?: Partial<TModel>): Promise<SelectOption<TValue>[]> | SelectOption<TValue>[];
  /** Keys of other fields that trigger a reload when their value changes */
  dependsOn?: (keyof TModel)[];
}

// =========================
// Validation Types
// =========================

export interface ValidationResult {
  status: ValidationStatus;
  code?: ValidationCode;
  message?: string;
}

export interface StepValidator {
  validate(): Promise<ValidationResult> | ValidationResult;
}

export interface FieldValidator {
  validate(value: unknown): Promise<ValidationResult> | ValidationResult;
}

export interface StepGuard {
  canEnter(): Promise<boolean> | boolean;
  canExit(): Promise<boolean> | boolean;
}

// =========================
// Modal Result & Events
// =========================

export interface ModalCloseEvent<TResult = unknown> {
  reason: ModalCloseReason;
  result?: TResult;
}

export interface ModalRef<TResult = unknown> {
  afterClosed$: Observable<ModalCloseEvent<TResult>>;
  close(result?: TResult): void;
  dismiss(reason: ModalCloseReason): void;
  update(config: Partial<BaseModalConfig<TResult>>): void;
}

// =========================
// Handlers
// =========================

export interface ModalResultHandler<TResult = unknown> {
  handle(result: TResult): Promise<void> | void;
}

export interface WizardStepChangeEvent {
  previousStepId?: ModalStepId;
  currentStepId: ModalStepId;
  direction: NavigationDirection;
}

export interface WizardStepChangeHandler {
  handle(event: WizardStepChangeEvent): Promise<void> | void;
}

// =========================
// Wizard Types
// =========================

export type StepBodyConfig = Type<unknown> | TemplateRef<unknown> | string;

export interface WizardStepConfig<TModel = any> {
  id: ModalStepId;
  title: string;
  state?: StepState;
  body?: StepBodyConfig;
  fields?: FormFieldConfig<TModel>[];
  rows?: FormRow<TModel>[];
  fieldGroups?: FormFieldGroup<TModel>[];
  formValidators?: FormValidator<TModel>[];
  groupValidators?: any[];
  initialValue?: Partial<TModel>;
  guard?: StepGuard;
  validators?: StepValidator[];
  /** Condition to show/hide this entire step based on aggregated wizard data */
  visible?: (aggregatedData: Record<ModalStepId, Record<string, any>>) => boolean;
}

export interface WizardResult {
  status: ModalCloseReason;
  visitedStepIds: ModalStepId[];
  payload?: Record<ModalStepId, Record<string, any>>;
}

// =========================
// Form Types
// =========================

export interface SelectOption<TValue = unknown> {
  label: string;
  value: TValue;
  state?: OptionState;
}

export interface TextFieldConfig<TModel = unknown> {
  kind: FieldKind.TEXT;
  key: keyof TModel;
  label: string;
  appearance?: FieldAppearance;
  validators?: any[];
  asyncValidators?: any[];
  placeholder?: string;
  /** Whether this field is read-only (display only) */
  readOnly?: boolean;
  /** Whether this field is disabled */
  disabled?: boolean;
  /** Condition to show/hide this field based on other field values */
  visible?: FieldVisibilityCondition<TModel>;
}

export interface NumberFieldConfig<TModel = unknown> {
  kind: FieldKind.NUMBER;
  key: keyof TModel;
  label: string;
  validators?: any[];
  asyncValidators?: any[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface SelectFieldConfig<TModel = unknown, TValue = unknown> {
  kind: FieldKind.SELECT;
  key: keyof TModel;
  label: string;
  options: SelectOption<TValue>[];
  selectionMode?: SelectionMode;
  validators?: any[];
  asyncValidators?: any[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Async data source for loading options dynamically */
  dataSource?: FieldDataSource<TValue, TModel>;
}

export interface CheckboxFieldConfig<TModel = unknown> {
  kind: FieldKind.CHECKBOX;
  key: keyof TModel;
  label: string;
  defaultValue?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface DateFieldConfig<TModel = unknown> {
  kind: FieldKind.DATE;
  key: keyof TModel;
  label: string;
  placeholder?: string;
  validators?: any[];
  asyncValidators?: any[];
  minDate?: string;
  maxDate?: string;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface TextareaFieldConfig<TModel = unknown> {
  kind: FieldKind.TEXTAREA;
  key: keyof TModel;
  label: string;
  placeholder?: string;
  validators?: any[];
  asyncValidators?: any[];
  rows?: number;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface DatetimeFieldConfig<TModel = unknown> {
  kind: FieldKind.DATETIME;
  key: keyof TModel;
  label: string;
  placeholder?: string;
  validators?: any[];
  asyncValidators?: any[];
  mode?: 'date' | 'time' | 'datetime-local';
  min?: string;
  max?: string;
  step?: number;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface MultiSelectFieldConfig<TModel = unknown, TValue = unknown> {
  kind: FieldKind.MULTI_SELECT;
  key: keyof TModel;
  label: string;
  options: SelectOption<TValue>[];
  validators?: any[];
  asyncValidators?: any[];
  searchable?: boolean;
  searchPlaceholder?: string;
  maxSelections?: number;
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  /** Async data source for loading options dynamically */
  dataSource?: FieldDataSource<TValue, TModel>;
}

export interface PasswordFieldConfig<TModel = unknown> {
  kind: FieldKind.PASSWORD;
  key: keyof TModel;
  label: string;
  placeholder?: string;
  validators?: any[];
  asyncValidators?: any[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface MultiSelectTableFieldConfig<TModel = unknown, TRow = any> {
  kind: FieldKind.MULTI_SELECT_TABLE;
  key: keyof TModel;
  label: string;
  /** The TableDataSource that powers the mn-table. selectionMode will be forced to 'multi'. */
  tableDataSource: TableDataSource<TRow>;
  /** Function to extract the value stored in the form from a selected row (default: getID) */
  getRowValue?: (row: TRow) => unknown;
  validators?: any[];
  asyncValidators?: any[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface SingleSelectTableFieldConfig<TModel = unknown, TRow = any> {
  kind: FieldKind.SINGLE_SELECT_TABLE;
  key: keyof TModel;
  label: string;
  /** The TableDataSource that powers the mn-table. selectionMode will be forced to 'single'. */
  tableDataSource: TableDataSource<TRow>;
  /** Function to extract the value stored in the form from a selected row (default: getID) */
  getRowValue?: (row: TRow) => unknown;
  validators?: any[];
  asyncValidators?: any[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface ColorFieldConfig<TModel = unknown> {
  kind: FieldKind.COLOR;
  key: keyof TModel;
  label: string;
  /** Default color value (hex string, e.g., '#ff0000') */
  defaultValue?: string;
  /** Predefined color swatches to show */
  swatches?: string[];
  validators?: any[];
  asyncValidators?: any[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface RatingFieldConfig<TModel = unknown> {
  kind: FieldKind.RATING;
  key: keyof TModel;
  label: string;
  /** Maximum rating value (default: 5) */
  max?: number;
  /** Icon to use for rating (default: 'star') */
  icon?: 'star' | 'heart' | 'circle';
  /** Allow half-star ratings (default: false) */
  allowHalf?: boolean;
  validators?: any[];
  asyncValidators?: any[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface SliderFieldConfig<TModel = unknown> {
  kind: FieldKind.SLIDER;
  key: keyof TModel;
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
  validators?: any[];
  asyncValidators?: any[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface FileFieldConfig<TModel = unknown> {
  kind: FieldKind.FILE;
  key: keyof TModel;
  label: string;
  /** Accepted file types (e.g., '.pdf,.jpg,image/*') */
  accept?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files (when multiple is true) */
  maxFiles?: number;
  validators?: any[];
  asyncValidators?: any[];
  readOnly?: boolean;
  disabled?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
}

export interface CustomFieldConfig<TModel = unknown> {
  kind: FieldKind.CUSTOM;
  key: keyof TModel;
  component: Type<unknown>;
  inputs?: ModalInputMap;
  label?: string;
  visible?: FieldVisibilityCondition<TModel>;
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
  | MultiSelectTableFieldConfig<TModel>
  | SingleSelectTableFieldConfig<TModel>
  | PasswordFieldConfig<TModel>
  | FileFieldConfig<TModel>
  | ColorFieldConfig<TModel>
  | RatingFieldConfig<TModel>
  | SliderFieldConfig<TModel>
  | CustomFieldConfig<TModel>;

// =========================
// Form Layout Types
// =========================

export interface FormRowField<TModel = unknown> {
  field: FormFieldConfig<TModel>;
  span?: number; // Number of columns this field spans (default: 1)
}

export interface FormRow<TModel = unknown> {
  columns?: number; // Number of columns in this row (default: 1 = full width)
  fields: FormRowField<TModel>[];
}

// =========================
// Field Group / Section Types
// =========================

export interface FormFieldGroup<TModel = unknown> {
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

export interface ConfirmationActionConfig<TResult = unknown> {
  label: string;
  style?: ActionStyle;
  handler?: ModalResultHandler<TResult>;
}

export interface CancellationActionConfig {
  label: string;
  style?: ActionStyle;
  reason?: ModalCloseReason;
}

// =========================
// Footer Action Types
// =========================

export interface ModalFooterAction<TResult = unknown> {
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

export interface ModalPollingConfig<TResult = unknown> {
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

export interface ModalI18nLabels {
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

export type ModalCancelHandler<TResult = unknown> = (reason: ModalCloseReason) => Promise<void> | void;

export interface BaseModalConfig<TResult = unknown> {
  kind: ModalKind;
  title?: string;
  subtitle?: string;
  description?: string;
  size?: ModalSize;
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
  onCancel?: ModalCancelHandler<TResult>;
  /** i18n labels for buttons and UI text */
  i18n?: ModalI18nLabels;
}

// =========================
// Specialized Configs
// =========================

/** Validator that receives aggregated data from all wizard steps before completion */
export type WizardBeforeCompleteValidator = (payload: Record<ModalStepId, Record<string, any>>) => Promise<Record<string, string> | null> | Record<string, string> | null;

export interface WizardModalConfig<TResult = WizardResult> extends BaseModalConfig<TResult> {
  kind: ModalKind.WIZARD;
  steps: WizardStepConfig[];
  startStepId?: ModalStepId;
  flow?: WizardFlowMode;
  onStepChange?: WizardStepChangeHandler;
  onComplete?: ModalResultHandler<TResult>;
  /** Cross-step validators run before wizard completion */
  onBeforeComplete?: WizardBeforeCompleteValidator[];
}

export interface FormModalConfig<TModel = unknown, TResult = TModel> extends BaseModalConfig<TResult> {
  kind: ModalKind.FORM;
  fields: FormFieldConfig<TModel>[];
  rows?: FormRow<TModel>[];
  layout?: FormLayoutMode;
  initialValue?: Partial<TModel>;
  submitMode?: SubmitMode;
  onComplete?: ModalResultHandler<TResult>;
  /** Form-level validators for cross-field validation */
  formValidators?: FormValidator<TModel>[];
  /** Angular FormGroup-level validators (e.g., Validators.required on the group) */
  groupValidators?: any[];
  /** Field groups with section headers */
  fieldGroups?: FormFieldGroup<TModel>[];
}

export interface ConfirmationModalConfig<TResult = boolean> extends BaseModalConfig<TResult> {
  kind: ModalKind.CONFIRMATION;
  message: string;
  tone?: ConfirmationTone;
  confirm?: ConfirmationActionConfig<TResult>;
  cancel?: CancellationActionConfig;
}

export interface CustomModalConfig<TResult = unknown> extends BaseModalConfig<TResult> {
  kind: ModalKind.CUSTOM;
  component?: Type<unknown>;
  template?: TemplateRef<unknown>;
  inputs?: ModalInputMap;
  onComplete?: ModalResultHandler<TResult>;
}

// =========================
// Union Root Config
// =========================

export type ModalConfig<TResult = any> =
  | WizardModalConfig<TResult>
  | FormModalConfig<any, TResult>
  | ConfirmationModalConfig<TResult>
  | CustomModalConfig<TResult>;
