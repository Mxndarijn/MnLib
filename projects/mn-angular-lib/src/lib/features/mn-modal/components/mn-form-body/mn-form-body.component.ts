import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  Type,
  ViewChildren,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  AbstractControlOptions,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {Subscription} from 'rxjs';
import {MnModalRef} from '../../mn-modal-ref';
import {
  FieldDataSource,
  FieldKind,
  FieldRequiredCondition,
  FieldVisibilityCondition,
  FileFieldConfig,
  FormFieldConfig,
  FormFieldGroup,
  FormModalConfig,
  FormRow,
  FormRowField,
  ModalCloseReason,
  ModalI18nLabels,
  ModalInputMap,
  MultiSelectTableFieldConfig,
  RatingFieldConfig,
  SelectOption,
  SingleSelectTableFieldConfig,
  SliderFieldConfig,
  SubmitMode,
} from '../../mn-modal.types';
import {MnButton} from '../../../mn-button';
import {MnInputField} from '../../../mn-input-field';
import {MnCheckbox} from '../../../mn-checkbox';
import {MnDatetime} from '../../../mn-datetime';
import {MnMultiSelect} from '../../../mn-multi-select';
import {MnTextarea} from '../../../mn-textarea';
import {MnFileInput} from '../../../mn-file-input';
import {MnSelect, MnSelectOption, MnSelectProps} from '../../../mn-select';
import {MnCustomFieldHostDirective} from './mn-custom-field-host.directive';
import {MnLanguageService} from '../../../../language';
import {MnTable, TableDataSource} from '../../../mn-table';
import {MnCustomBodyHostComponent} from '../mn-custom-body-host/mn-custom-body-host.component';

/**
 * A structural "view" over the {@link FormFieldConfig} discriminated union that
 * exposes every member-specific property as optional. The template and several
 * helpers need to read properties that only exist on some union members (e.g.
 * `placeholder`, `swatches`, `mode`, `dataSource`, `validators`). Casting the
 * field to this view keeps that access type-checked without resorting to `any`.
 */
type FormFieldView<TModel> = FormFieldConfig<TModel> & {
  label?: string;
  placeholder?: string;
  validators?: ValidatorFn[];
  asyncValidators?: ValidatorFn[];
  updateOn?: 'change' | 'blur' | 'submit';
  options?: SelectOption[];
  dataSource?: FieldDataSource;
  disabled?: boolean;
  readOnly?: boolean;
  visible?: FieldVisibilityCondition<TModel>;
  conditionallyRequired?: FieldRequiredCondition<TModel>;
  autoFocus?: boolean;
  defaultValue?: unknown;
  mask?: string;
  autocomplete?: string;
  minDate?: string;
  maxDate?: string;
  mode?: 'date' | 'time' | 'datetime-local';
  min?: number | string;
  max?: number | string;
  step?: number;
  rows?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  maxSelections?: number;
  swatches?: string[];
  showValue?: boolean;
  unit?: string;
  accept?: string;
  multiple?: boolean;
  displayMode?: 'dropzone' | 'thumbnail' | 'list' | 'compact';
  dropzoneHint?: string;
  replaceLabel?: string;
  removeLabel?: string;
  currentUrl?: string | null;
  currentUrls?: string[] | null;
  onClear?: () => void;
  // Non-optional in the view: the template only reads these inside the
  // matching @case/@if guards where the runtime value is always present.
  // Keeping them non-undefined avoids spurious template type errors that the
  // previous `any` cast masked, without changing runtime behavior.
  maxSize: number;
  maxFiles?: number;
  component: Type<unknown>;
  inputs?: ModalInputMap;
};

@Component({
  selector: 'mn-form-body',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MnButton, MnInputField, MnCheckbox, MnDatetime, MnMultiSelect, MnTextarea, MnFileInput, MnSelect, MnCustomFieldHostDirective, MnTable, MnCustomBodyHostComponent],
  templateUrl: './mn-form-body.component.html',
  styleUrls: ['./mn-form-body.component.css'],
})
export class MnFormBodyComponent<TModel = unknown, TResult = TModel> implements OnInit, OnDestroy, AfterViewInit {
  private fb = inject(FormBuilder);

  @Input() config!: FormModalConfig<TModel, TResult>;
  @Input() modalRef!: MnModalRef<TResult>;
  @Input() hideFooter = false;
  @Input() hideCustomBody = false;
  @Output() formStatusChange = new EventEmitter<string>();

  @ViewChildren(MnInputField) inputFields?: QueryList<MnInputField>;
  @ViewChildren(MnTextarea) textareas?: QueryList<MnTextarea>;

  form!: FormGroup;
  rows: FormRow<TModel>[] = [];
  fieldGroups: FormFieldGroup<TModel>[] = [];
  isSubmitting = false;
  readonly FieldKind = FieldKind;
  readonly ModalCloseReason = ModalCloseReason;

  /** Cross-field validation errors: { fieldKey: errorMessage } */
  formErrors: Record<string, string> = {};

  /** Track which fields are currently visible (for conditional fields) */
  fieldVisibility: Record<string, boolean> = {};

  /** Track which fields are currently conditionally required */
  fieldConditionallyRequired: Record<string, boolean> = {};

  /** Track loading state per field for async data sources */
  fieldLoading: Record<string, boolean> = {};

  /** Dynamic options loaded from data sources */
  fieldOptions: Record<string, SelectOption[]> = {};

  private valueChangesSubscription?: Subscription;

  asField(field: FormFieldConfig<TModel>): FormFieldView<TModel> {
    return field as FormFieldView<TModel>;
  }

  asKey(key: keyof TModel | string): string {
    return key as string;
  }

  // The template builds untyped `props` object literals and passes them to
  // strongly-typed child component `[props]` inputs. There is no single static
  // type for those literals, so this identity bridge must return `any` to keep
  // the template assignment-compatible. This is a genuine template-bridge case.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asAny(val: unknown): any {
    return val;
  }

  hasRequiredValidator(field: FormFieldConfig<TModel>): boolean {
    const view = field as FormFieldView<TModel>;
    // Check if conditionallyRequired is currently active
    if (view.conditionallyRequired) {
      const formValue = (this.form?.value ?? {}) as Partial<TModel>;
      if (view.conditionallyRequired(formValue)) return true;
    }
    const validators = view.validators;
    if (!validators) return false;
    // Check if Validators.required is in the array by testing a dummy control
    const control = this.fb.control(null, validators);
    const errors = control.errors;
    return errors != null && 'required' in errors;
  }

  /** Store table data sources keyed by field key for template access */
  tableDataSources: Record<string, TableDataSource<unknown>> = {};

  private languageService = inject(MnLanguageService);

  private static readonly DEFAULT_LABELS: Record<string, string> = {
    submit: 'Submit',
    cancel: 'Cancel',
    submitting: 'Submitting...',
    selectPlaceholder: 'Select...',
    loading: 'Loading...',
    fileUploadPrompt: 'Click or drag files here',
    fieldRequired: 'This field is required',
    loadingOptions: 'Loading options...',
    accepted: 'Accepted:',
    maxSize: 'Max size:',
  };

  private resolveLabel(i18nValue: string | undefined, key: string): string {
    if (i18nValue) return i18nValue;
    const translated = this.languageService.translate(`common.${key}`);
    return translated === `common.${key}` ? MnFormBodyComponent.DEFAULT_LABELS[key] : translated;
  }

  /** Resolved i18n labels with defaults, falling back to translated keys */
  get labels() {
    // The config's i18n map may carry extra keys beyond ModalI18nLabels (e.g.
    // fieldRequired, loadingOptions), so widen the type to expose them as
    // declared optional properties (keeps dot access type-checked).
    const i18n: ModalI18nLabels &
      Partial<Record<'fieldRequired' | 'loadingOptions' | 'accepted' | 'maxSize', string>> =
      this.config.i18n || {};
    return {
      submit: this.resolveLabel(i18n.submit, 'submit'),
      cancel: this.resolveLabel(i18n.cancel, 'cancel'),
      submitting: this.resolveLabel(i18n.submitting, 'submitting'),
      selectPlaceholder: this.resolveLabel(i18n.selectPlaceholder, 'selectPlaceholder'),
      loading: this.resolveLabel(i18n.loading, 'loading'),
      fileUploadPrompt: this.resolveLabel(i18n.fileUploadPrompt, 'fileUploadPrompt'),
      fieldRequired: this.resolveLabel(i18n.fieldRequired, 'fieldRequired'),
      loadingOptions: this.resolveLabel(i18n.loadingOptions, 'loadingOptions'),
      accepted: this.resolveLabel(i18n.accepted, 'accepted'),
      maxSize: this.resolveLabel(i18n.maxSize, 'maxSize'),
    };
  }

  ngOnInit(): void {
    this.initializeForm();
    this.buildRows();
    this.initializeVisibility();
    this.initializeDataSources();
    this.initializeTableFields();
    this.subscribeToValueChanges();

    if (this.config.disabled || this.config.readOnly) {
      this.form.disable();
    }

    // Emit initial status
    setTimeout(() => {
      this.formStatusChange.emit(this.form.status);
    });
  }

  ngAfterViewInit(): void {
    // Small delay to ensure children are fully rendered and MnModalShell hasn't just stolen focus
    setTimeout(() => {
      this.applyAutoFocus();
    }, 100);
  }

  public applyAutoFocus(): void {
    const autoFocusField = this.config.fields.find(f => (f as FormFieldView<TModel>).autoFocus);
    if (!autoFocusField) return;

    const key = autoFocusField.key as string;

    // Small delay to ensure browser is ready to focus
    setTimeout(() => {
      // Try finding in MnInputField components
      const inputField = this.inputFields?.find(f => f.props.id === key);
      if (inputField) {
        inputField.focus();
        return;
      }

      // Try finding in MnTextarea components
      const textarea = this.textareas?.find(f => f.props?.id === key);
      if (textarea) {
        textarea.focus();
        return;
      }

      // Fallback to native element if possible
      const el = document.getElementById(key);
      if (el) el.focus();
    }, 50);
  }

  ngOnDestroy(): void {
    this.valueChangesSubscription?.unsubscribe();
  }

  private initializeForm(): void {
    const formControls: Record<string, [unknown, AbstractControlOptions]> = {};

    this.config.fields.forEach(field => {
      const fieldConfig = field as FormFieldView<TModel>;
      let initialValue: unknown = this.config.initialValue?.[field.key as keyof TModel] ?? null;

      // Handle checkbox default values
      if (field.kind === FieldKind.CHECKBOX && initialValue === null) {
        initialValue = fieldConfig.defaultValue ?? false;
      }

    const validators = fieldConfig.validators || [];
    const asyncValidators = fieldConfig.asyncValidators || [];
    const updateOn = fieldConfig.updateOn || 'change';

    formControls[field.key as string] = [
      initialValue,
      {
        validators,
        asyncValidators,
        updateOn
      }
    ];
  });

    this.form = this.fb.group(formControls);

    // Apply Angular FormGroup-level validators
    if (this.config.groupValidators && this.config.groupValidators.length > 0) {
      this.form.setValidators(this.config.groupValidators);
      this.form.updateValueAndValidity();
    }

    // Apply disabled/readOnly state to controls
    this.config.fields.forEach(field => {
      const fieldView = field as FormFieldView<TModel>;
      const control = this.form.get(field.key as string);
      if (control && (fieldView.disabled || fieldView.readOnly)) {
        control.disable();
      }
    });
  }

  isFieldReadOnly(field: FormFieldConfig<TModel>): boolean {
    return this.config.readOnly === true || (field as FormFieldView<TModel>).readOnly === true;
  }

  isFieldDisabled(field: FormFieldConfig<TModel>): boolean {
    return this.config.disabled === true || (field as FormFieldView<TModel>).disabled === true;
  }

  /** Track which field groups are currently visible */
  groupVisibility: Record<string, boolean> = {};

  private buildRows(): void {
    if (this.config.rows && this.config.rows.length > 0) {
      this.rows = this.config.rows;
    } else {
      // Create rows for fields that are not in any row or group
      const fieldsInGroups = new Set<string>();
      (this.config.fieldGroups || []).forEach(g => {
        (g.rows || []).forEach(r => r.fields.forEach(f => fieldsInGroups.add(f.field.key as string)));
        // Also check if group has flat fields list (compatibility)
        if (g.fields) {
          g.fields.forEach(f => fieldsInGroups.add(f.key as string));
        }
      });

      const fieldsInRows = new Set<string>();
      (this.config.rows || []).forEach(r => r.fields.forEach(f => fieldsInRows.add(f.field.key as string)));

      const standaloneFields = this.config.fields.filter(f => !fieldsInGroups.has(f.key as string) && !fieldsInRows.has(f.key as string));

      if (standaloneFields.length > 0) {
        this.rows = standaloneFields.map(field => ({
          columns: 1,
          fields: [{ field, span: 1 }],
        }));
      }
    }
    // Build field groups
    this.fieldGroups = this.config.fieldGroups || [];
    // Initialize group visibility
    this.initializeGroupVisibility();
  }

  private initializeGroupVisibility(): void {
    this.fieldGroups.forEach((group, index) => {
      const key = group.title || `group-${index}`;
      const isVisible = group.visible ? group.visible(this.form.value) : true;
      this.groupVisibility[key] = isVisible;
      // If group is hidden, clear validators on its fields
      if (!isVisible) {
        group.fields.forEach(field => {
          const control = this.form.get(field.key as string);
          if (control) {
            control.clearValidators();
            control.updateValueAndValidity({ emitEvent: false });
          }
        });
      }
    });
  }

  private updateGroupVisibility(): void {
    const formValue = this.form.value;
    this.fieldGroups.forEach((group, index) => {
      const key = group.title || `group-${index}`;
      const wasVisible = this.groupVisibility[key];
      const isVisible = group.visible ? group.visible(formValue) : true;
      this.groupVisibility[key] = isVisible;

      if (!isVisible && wasVisible) {
        // Group became hidden — clear validators on its fields
        group.fields.forEach(field => {
          const control = this.form.get(field.key as string);
          if (control) {
            control.clearValidators();
            control.updateValueAndValidity({ emitEvent: false });
          }
        });
      } else if (isVisible && !wasVisible) {
        // Group became visible — restore validators
        group.fields.forEach(field => {
          const fieldView = field as FormFieldView<TModel>;
          const validators = fieldView.validators || [];
          const control = this.form.get(field.key as string);
          if (control) {
            control.setValidators(validators);
            control.updateValueAndValidity({ emitEvent: false });
          }
        });
      }
    });
  }

  isGroupVisible(group: FormFieldGroup<TModel>): boolean {
    const key = group.title || `group-${this.fieldGroups.indexOf(group)}`;
    return this.groupVisibility[key];
  }

  // =========================
  // Feature 1: Conditional/Dynamic Fields
  // =========================

  private initializeVisibility(): void {
    const formValue = this.form.value as Partial<TModel>;
    this.config.fields.forEach(field => {
      const key = field.key as string;
      const fieldView = field as FormFieldView<TModel>;
      const isVisible = fieldView.visible ? fieldView.visible(formValue) : true;
      this.fieldVisibility[key] = isVisible;

      // If initially hidden, clear validators so they don't block submit
      if (!isVisible) {
        const control = this.form.get(key);
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity({ emitEvent: false });
        }
      } else if (fieldView.conditionallyRequired) {
        // Initialize conditionallyRequired state for visible fields
        const isRequired = fieldView.conditionallyRequired(formValue);
        this.fieldConditionallyRequired[key] = isRequired;
        if (isRequired) {
          const control = this.form.get(key);
          if (control) {
            const validators = this.buildValidators(fieldView, formValue);
            control.setValidators(validators);
            control.updateValueAndValidity({emitEvent: false});
          }
        }
      }
    });
  }

  private updateVisibility(): void {
    const formValue = this.form.value as Partial<TModel>;
    this.config.fields.forEach(field => {
      const key = field.key as string;
      const fieldView = field as FormFieldView<TModel>;
      const wasVisible = this.fieldVisibility[key];
      const isVisible = fieldView.visible ? fieldView.visible(formValue) : true;
      this.fieldVisibility[key] = isVisible;

      // When a field becomes hidden, clear its validators so it doesn't block submit
      const control = this.form.get(key);
      if (control) {
        if (!isVisible && wasVisible) {
          control.clearValidators();
          control.updateValueAndValidity({ emitEvent: false });
        } else if (isVisible && !wasVisible) {
          // Restore validators (including conditionallyRequired if active)
          const validators = this.buildValidators(fieldView, formValue);
          control.setValidators(validators);
          control.updateValueAndValidity({emitEvent: false});
        } else if (isVisible) {
          // Update conditionallyRequired for visible fields
          this.updateConditionallyRequired(fieldView, formValue);
        }
      }
    });
  }

  /**
   * Builds the full validator array for a field, including conditionallyRequired.
   * @param field The field configuration view.
   * @param formValue The current form values.
   * @returns Array of validators to apply.
   */
  private buildValidators(field: FormFieldView<TModel>, formValue: Partial<TModel>): ValidatorFn[] {
    const baseValidators = field.validators ? [...field.validators] : [];
    if (field.conditionallyRequired && field.conditionallyRequired(formValue)) {
      if (!baseValidators.includes(Validators.required)) {
        baseValidators.push(Validators.required);
      }
    }
    return baseValidators;
  }

  /**
   * Updates the conditionallyRequired state for a single field and adjusts validators.
   * @param field The field configuration view.
   * @param formValue The current form values.
   */
  private updateConditionallyRequired(field: FormFieldView<TModel>, formValue: Partial<TModel>): void {
    if (!field.conditionallyRequired) return;
    const key = field.key as string;
    const wasRequired = this.fieldConditionallyRequired[key] ?? false;
    const isRequired = field.conditionallyRequired(formValue);
    this.fieldConditionallyRequired[key] = isRequired;

    if (isRequired !== wasRequired) {
      const control = this.form.get(key);
      if (control) {
        const validators = this.buildValidators(field, formValue);
        control.setValidators(validators);
        control.updateValueAndValidity({emitEvent: false});
      }
    }
  }

  isFieldVisible(field: FormFieldConfig<TModel>): boolean {
    return this.fieldVisibility[field.key as string];
  }

  // =========================
  // Feature 2: Cross-Field Validation
  // =========================

  private runFormValidators(): void {
    this.formErrors = {};
    if (!this.config.formValidators) return;

    const formValue = this.form.value;
    for (const validator of this.config.formValidators) {
      const errors = validator(formValue);
      if (errors) {
        Object.assign(this.formErrors, errors);
      }
    }
  }

  getFieldError(key: string): string | null {
    return this.formErrors[key] || null;
  }

  get hasFormErrors(): boolean {
    return Object.keys(this.formErrors).length > 0;
  }

  // =========================
  // Feature 3: Async Data Sources
  // =========================

  private initializeDataSources(): void {
    this.config.fields.forEach(field => {
      const fieldView = field as FormFieldView<TModel>;
      if (fieldView.dataSource) {
        this.loadFieldOptions(field.key as string, fieldView.dataSource, this.form.value as Partial<TModel>);
      }
    });
  }

  isFieldLoading(key: string): boolean {
    return this.fieldLoading[key];
  }

  /** Get options for a field — uses dataSource options if available, otherwise static options */
  getFieldOptions(field: FormFieldConfig<TModel>): SelectOption[] {
    const key = field.key as string;
    if (this.fieldOptions[key] !== undefined) {
      return this.fieldOptions[key];
    }
    return (field as FormFieldView<TModel>).options || [];
  }

  /** Convert SelectOption[] to MnSelectOption[] for mn-lib-select */
  getSelectOptions(field: FormFieldConfig<TModel>): MnSelectOption[] {
    return this.getFieldOptions(field).map(o => ({
      label: o.label,
      value: o.value,
      disabled: o.state === 'disabled',
    }));
  }

  getSelectProps(field: FormFieldConfig<TModel>): MnSelectProps {
    return {
      id: field.key as string,
      label: this.asField(field).label,
      placeholder: this.isFieldLoading(field.key as string) ? this.labels.loading : this.labels.selectPlaceholder,
      options: this.getSelectOptions(field),
    };
  }

  private async loadFieldOptions(key: string, dataSource: FieldDataSource, formValue: Partial<TModel>): Promise<void> {
    this.fieldLoading[key] = true;
    try {
      this.fieldOptions[key] = await dataSource.load(formValue);
    } catch (error) {
      console.error(`Failed to load options for field '${key}':`, error);
      this.fieldOptions[key] = [];
    } finally {
      this.fieldLoading[key] = false;
    }
  }

  // =========================
  // Feature: Multi-Select Table Fields
  // =========================

  private initializeTableFields(): void {
    this.config.fields.forEach(field => {
      if (field.kind === FieldKind.MULTI_SELECT_TABLE) {
        const tableField = field as MultiSelectTableFieldConfig<TModel>;
        const ds = tableField.tableDataSource;
        // Force multi selection mode
        ds.selectionMode = 'multi';

        // Pre-select rows from the form's initial value
        const control = this.form.get(field.key as string);
        if (control && Array.isArray(control.value) && control.value.length > 0) {
          ds.initialSelectedIds = control.value.map((v: unknown) => String(v));
        } else if (control && control.value === null) {
          control.setValue([], { emitEvent: false });
        }

        this.tableDataSources[field.key as string] = ds;
      } else if (field.kind === FieldKind.SINGLE_SELECT_TABLE) {
        const tableField = field as SingleSelectTableFieldConfig<TModel>;
        const ds = tableField.tableDataSource;
        // Force single selection mode
        ds.selectionMode = 'single';

        // Pre-select row from the form's initial value
        const control = this.form.get(field.key as string);
        if (control && control.value != null) {
          ds.initialSelectedIds = [String(control.value)];
        }

        this.tableDataSources[field.key as string] = ds;
      }
    });
  }

  onTableSelectionChange(field: FormFieldConfig<TModel>, selectedRows: unknown[]): void {
    if (field.kind === FieldKind.SINGLE_SELECT_TABLE) {
      const tableField = field as SingleSelectTableFieldConfig<TModel>;
      const getVal = tableField.getRowValue || tableField.tableDataSource.getID;
      const value = selectedRows.length > 0 ? getVal(selectedRows[0]) : null;
      const control = this.form.get(field.key as string);
      if (control) {
        control.setValue(value);
        control.markAsTouched();
      }
    } else {
      const tableField = field as MultiSelectTableFieldConfig<TModel>;
      const getVal = tableField.getRowValue || tableField.tableDataSource.getID;
      const values = selectedRows.map(row => getVal(row));
      const control = this.form.get(field.key as string);
      if (control) {
        control.setValue(values);
        control.markAsTouched();
      }
    }
  }

  // =========================
  // Feature: Rating Fields
  // =========================

  getRatingRange(field: FormFieldConfig<TModel>): number[] {
    const max = (field as RatingFieldConfig<TModel>).max || 5;
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  setRating(field: FormFieldConfig<TModel>, value: number): void {
    const control = this.form.get(field.key as string);
    if (control) {
      control.setValue(value);
      control.markAsTouched();
    }
  }

  getRatingValue(field: FormFieldConfig<TModel>): number {
    return this.form.get(field.key as string)?.value || 0;
  }

  // =========================
  // Feature: Slider Fields
  // =========================

  onSliderChange(field: FormFieldConfig<TModel>, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    const control = this.form.get(field.key as string);
    if (control) {
      control.setValue(value);
      control.markAsTouched();
    }
  }

  getSliderValue(field: FormFieldConfig<TModel>): number {
    const f = field as SliderFieldConfig<TModel>;
    return this.form.get(field.key as string)?.value ?? f.min ?? 0;
  }

  // =========================
  // Feature: Color Fields
  // =========================

  onColorChange(field: FormFieldConfig<TModel>, event: Event): void {
    const input = event.target as HTMLInputElement;
    const control = this.form.get(field.key as string);
    if (control) {
      control.setValue(input.value);
      control.markAsTouched();
    }
  }

  setColorFromSwatch(field: FormFieldConfig<TModel>, color: string): void {
    const control = this.form.get(field.key as string);
    if (control) {
      control.setValue(color);
      control.markAsTouched();
    }
  }

  getColorValue(field: FormFieldConfig<TModel>): string {
    return this.form.get(field.key as string)?.value || '#000000';
  }

  // =========================
  // Value Changes Subscription
  // =========================

  private subscribeToValueChanges(): void {
    // Initialize previousFormValue with current form state to avoid false "changed" on first emission
    this.previousFormValue = { ...this.form.value };

    this.valueChangesSubscription = this.form.valueChanges.subscribe(formValue => {
      // Update conditional visibility
      this.updateVisibility();

      // Update group visibility
      this.updateGroupVisibility();

      // Run cross-field validators
      this.runFormValidators();

      // Reload data sources that depend on changed fields
      this.reloadDependentDataSources(formValue);

      // Emit status change
      this.formStatusChange.emit(this.form.status);
    });
  }

  private previousFormValue: Partial<TModel> = {};

  private reloadDependentDataSources(formValue: Partial<TModel>): void {
    this.config.fields.forEach(field => {
      const fieldView = field as FormFieldView<TModel>;
      const dataSource: FieldDataSource | undefined = fieldView.dataSource;
      if (!dataSource?.dependsOn) return;

      // Check if any dependency changed
      const changed = dataSource.dependsOn.some(depKey => {
        return formValue[depKey as keyof TModel] !== this.previousFormValue[depKey as keyof TModel];
      });

      if (changed) {
        this.loadFieldOptions(field.key as string, dataSource, formValue);
      }
    });
    this.previousFormValue = { ...formValue };
  }

  getGridColumns(row: FormRow<TModel>): string {
    const cols = row.columns || 1;
    return `repeat(${cols}, 1fr)`;
  }

  getGridSpan(rowField: FormRowField<TModel>): string {
    const span = rowField.span || 1;
    return span > 1 ? `span ${span}` : '';
  }

  // =========================
  // Feature: File Upload Fields
  // =========================

  /**
   * Invokes a FILE field's `onClear` callback when its existing image is removed.
   * FILE fields render {@link MnFileInput}, which owns selection/validation and
   * writes the value (`File | File[] | null`) straight to the form control.
   * @param field The field whose existing image was cleared.
   */
  onFileCleared(field: FormFieldConfig<TModel>): void {
    (field as FileFieldConfig<TModel>).onClear?.();
  }

  async submit(): Promise<void> {
    // Run cross-field validators before submit
    this.runFormValidators();

    if (this.form.invalid || this.isSubmitting || this.hasFormErrors) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.config.submitMode === SubmitMode.ONCE) {
      this.isSubmitting = true;
    }

    const formValue = this.form.value as TResult;

    try {
      if (this.config.onComplete) {
        await this.config.onComplete.handle(formValue);
      }
      this.modalRef.close(formValue);
    } catch (error) {
      // Always allow retry on error, regardless of submit mode
      this.isSubmitting = false;
      console.error('Form submission error:', error);
    }
  }
}
