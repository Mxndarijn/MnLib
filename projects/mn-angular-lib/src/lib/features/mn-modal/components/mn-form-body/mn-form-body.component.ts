import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  AfterViewInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MnModalRef } from '../../mn-modal-ref';
import {
  FormModalConfig,
  FormLayoutMode,
  FormRow,
  FormRowField,
  FormFieldConfig,
  FormFieldGroup,
  FieldKind,
  SubmitMode,
  ModalCloseReason,
  SelectOption,
  FieldDataSource,
  FileFieldConfig,
} from '../../mn-modal.types';
import { MnButton } from '../../../mn-button';
import { MnInputField } from '../../../mn-input-field';
import { MnCheckbox } from '../../../mn-checkbox/mn-checkbox';
import { MnDatetime } from '../../../mn-datetime/mn-datetime';
import { MnMultiSelect } from '../../../mn-multi-select/mn-multi-select';
import { MnTextarea } from '../../../mn-textarea/mn-textarea';
import { MnCustomFieldHostDirective } from './mn-custom-field-host.directive';
import { MnLanguageService } from '../../../../language/mn-language.service';
import { MnTable } from '../../../mn-table/mn-table.component';
import { MultiSelectTableFieldConfig, SingleSelectTableFieldConfig, RatingFieldConfig, SliderFieldConfig, ColorFieldConfig } from '../../mn-modal.types';
import { MnCustomBodyHostComponent } from '../mn-custom-body-host/mn-custom-body-host.component';

@Component({
  selector: 'mn-form-body',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MnButton, MnInputField, MnCheckbox, MnDatetime, MnMultiSelect, MnTextarea, MnCustomFieldHostDirective, MnTable, MnCustomBodyHostComponent],
  templateUrl: './mn-form-body.component.html',
  styleUrls: ['./mn-form-body.component.css'],
})
export class MnFormBodyComponent<TModel = any, TResult = TModel> implements OnInit, OnDestroy, AfterViewInit {
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

  /** Track loading state per field for async data sources */
  fieldLoading: Record<string, boolean> = {};

  /** Dynamic options loaded from data sources */
  fieldOptions: Record<string, SelectOption[]> = {};

  private valueChangesSubscription?: Subscription;

  constructor(private fb: FormBuilder) {}

  asField(field: any): any {
    return field;
  }

  asKey(key: any): string {
    return key as string;
  }

  asAny(val: any): any {
    return val;
  }

  hasRequiredValidator(field: any): boolean {
    const validators = field.validators as any[] | undefined;
    if (!validators) return false;
    // Check if Validators.required is in the array by testing a dummy control
    const control = this.fb.control(null, validators);
    const errors = control.errors;
    return errors != null && 'required' in errors;
  }

  /** Store table data sources keyed by field key for template access */
  tableDataSources: Record<string, any> = {};

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
    const i = this.config as any;
    const i18n = i.i18n || {};
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
    const autoFocusField = this.config.fields.find(f => (f as any).autoFocus);
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
      const textarea = this.textareas?.find(f => (f as any).props?.id === key);
      if (textarea && typeof (textarea as any).focus === 'function') {
        (textarea as any).focus();
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
    const formControls: Record<string, any> = {};

    this.config.fields.forEach(field => {
      const fieldConfig = field as any;
      let initialValue = this.config.initialValue?.[field.key as keyof TModel] ?? null;

      // Handle checkbox default values
      if (field.kind === FieldKind.CHECKBOX && initialValue === null) {
        initialValue = (fieldConfig.defaultValue ?? false) as any;
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
      const fieldAny = field as any;
      const control = this.form.get(field.key as string);
      if (control && (fieldAny.disabled || fieldAny.readOnly)) {
        control.disable();
      }
    });
  }

  isFieldReadOnly(field: FormFieldConfig<TModel>): boolean {
    return this.config.readOnly === true || (field as any).readOnly === true;
  }

  isFieldDisabled(field: FormFieldConfig<TModel>): boolean {
    return this.config.disabled === true || (field as any).disabled === true;
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
        if ((g as any).fields) {
          (g as any).fields.forEach((f: any) => fieldsInGroups.add(f.key as string));
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
          const fieldAny = field as any;
          const validators = fieldAny.validators || [];
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
    return this.groupVisibility[key] !== false;
  }

  // =========================
  // Feature 1: Conditional/Dynamic Fields
  // =========================

  private initializeVisibility(): void {
    this.config.fields.forEach(field => {
      const key = field.key as string;
      const fieldAny = field as any;
      const isVisible = fieldAny.visible ? fieldAny.visible(this.form.value) : true;
      this.fieldVisibility[key] = isVisible;

      // If initially hidden, clear validators so they don't block submit
      if (!isVisible) {
        const control = this.form.get(key);
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity({ emitEvent: false });
        }
      }
    });
  }

  private updateVisibility(): void {
    const formValue = this.form.value;
    this.config.fields.forEach(field => {
      const key = field.key as string;
      const fieldAny = field as any;
      const wasVisible = this.fieldVisibility[key];
      const isVisible = fieldAny.visible ? fieldAny.visible(formValue) : true;
      this.fieldVisibility[key] = isVisible;

      // When a field becomes hidden, clear its validators so it doesn't block submit
      const control = this.form.get(key);
      if (control) {
        if (!isVisible && wasVisible) {
          control.clearValidators();
          control.updateValueAndValidity({ emitEvent: false });
        } else if (isVisible && !wasVisible) {
          // Restore validators
          const validators = (fieldAny as any).validators || [];
          control.setValidators(validators);
          control.updateValueAndValidity({ emitEvent: false });
        }
      }
    });
  }

  isFieldVisible(field: FormFieldConfig<TModel>): boolean {
    return this.fieldVisibility[field.key as string] !== false;
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
      const fieldAny = field as any;
      if (fieldAny.dataSource) {
        this.loadFieldOptions(field.key as string, fieldAny.dataSource, this.form.value);
      }
    });
  }

  private async loadFieldOptions(key: string, dataSource: FieldDataSource, formValue: any): Promise<void> {
    this.fieldLoading[key] = true;
    try {
      const options = await dataSource.load(formValue);
      this.fieldOptions[key] = options;
    } catch (error) {
      console.error(`Failed to load options for field '${key}':`, error);
      this.fieldOptions[key] = [];
    } finally {
      this.fieldLoading[key] = false;
    }
  }

  /** Get options for a field — uses dataSource options if available, otherwise static options */
  getFieldOptions(field: FormFieldConfig<TModel>): SelectOption[] {
    const key = field.key as string;
    if (this.fieldOptions[key] !== undefined) {
      return this.fieldOptions[key];
    }
    return (field as any).options || [];
  }

  isFieldLoading(key: string): boolean {
    return this.fieldLoading[key] === true;
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
          ds.initialSelectedIds = control.value.map((v: any) => String(v));
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

  onTableSelectionChange(field: FormFieldConfig<TModel>, selectedRows: any[]): void {
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

  private previousFormValue: Record<string, any> = {};

  private reloadDependentDataSources(formValue: any): void {
    this.config.fields.forEach(field => {
      const fieldAny = field as any;
      const dataSource: FieldDataSource | undefined = fieldAny.dataSource;
      if (!dataSource?.dependsOn) return;

      // Check if any dependency changed
      const changed = dataSource.dependsOn.some((depKey: any) => {
        return formValue[depKey] !== this.previousFormValue[depKey];
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

  /** Store selected files keyed by field key */
  fileSelections: Record<string, File[]> = {};

  onFileChange(field: FormFieldConfig<TModel>, event: Event): void {
    const input = event.target as HTMLInputElement;
    const fileField = field as FileFieldConfig<TModel>;
    const files = Array.from(input.files || []);
    const key = field.key as string;

    // Validate file size
    if (fileField.maxSize) {
      const oversized = files.filter(f => f.size > fileField.maxSize!);
      if (oversized.length > 0) {
        // Remove oversized files
        const valid = files.filter(f => f.size <= fileField.maxSize!);
        this.fileSelections[key] = fileField.multiple
          ? [...(this.fileSelections[key] || []), ...valid]
          : valid.slice(0, 1);
      } else {
        this.fileSelections[key] = fileField.multiple
          ? [...(this.fileSelections[key] || []), ...files]
          : files.slice(0, 1);
      }
    } else {
      this.fileSelections[key] = fileField.multiple
        ? [...(this.fileSelections[key] || []), ...files]
        : files.slice(0, 1);
    }

    // Enforce maxFiles
    if (fileField.maxFiles && this.fileSelections[key].length > fileField.maxFiles) {
      this.fileSelections[key] = this.fileSelections[key].slice(0, fileField.maxFiles);
    }

    const control = this.form.get(key);
    if (control) {
      control.setValue(this.fileSelections[key]);
      control.markAsTouched();
    }

    // Reset input so same file can be re-selected
    input.value = '';
  }

  removeFile(key: string, index: number): void {
    this.fileSelections[key] = (this.fileSelections[key] || []).filter((_, i) => i !== index);
    const control = this.form.get(key);
    if (control) {
      control.setValue(this.fileSelections[key].length > 0 ? this.fileSelections[key] : null);
    }
  }

  getSelectedFiles(key: string): File[] {
    return this.fileSelections[key] || [];
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getFileError(field: FormFieldConfig<TModel>): string {
    const control = this.form.get(field.key as string);
    if (!control?.errors) return 'This field is required';
    if (control.errors['required']) return 'Please select a file';
    return 'Invalid file';
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
