import {Component, ElementRef, HostListener, inject, InjectionToken, Input, OnInit, Optional, Self} from '@angular/core';
import {NgClass} from '@angular/common';
import {MnMultiSelectProps, MnMultiSelectOption, MnMultiSelectErrorMessageData, MnMultiSelectUIConfig} from './mn-multi-selectTypes';
import {NgControl, ValidationErrors, Validators} from '@angular/forms';
import {mnMultiSelectVariants} from './mn-multi-selectVariants';
import {MnErrorMessage} from '../mn-error-message/mn-error-message';
import {MnConfigService} from "../../config/mn-config.service";
import {MN_INSTANCE_ID, MN_SECTION_PATH} from "../../context/mn-context.tokens";

export const MN_MULTI_SELECT_CONFIG = new InjectionToken<MnMultiSelectUIConfig>('MN_MULTI_SELECT_CONFIG');

@Component({
  selector: 'mn-lib-multi-select',
  standalone: true,
  imports: [NgClass, MnErrorMessage],
  templateUrl: './mn-multi-select.html',
})
export class MnMultiSelect implements OnInit {
  protected uiConfig: MnMultiSelectUIConfig = {};

  @Input({ required: true }) props!: MnMultiSelectProps;

  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, { optional: true }) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, { optional: true });
  private readonly elRef = inject(ElementRef);

  /** Currently selected values */
  selectedValues: unknown[] = [];
  isOpen = false;
  isDisabled = false;
  searchTerm = '';

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  private readonly builtInErrorMessages: Record<string, MnMultiSelectErrorMessageData> = {
    required: 'At least one option must be selected',
  };

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngOnInit() {
    this.resolveConfig();
  }

  private resolveConfig() {
    const instanceId = this.explicitInstanceId || `mn-multi-select-${this.props.id}`;
    this.uiConfig = this.configService.resolve<MnMultiSelectUIConfig>(
      'mn-multi-select',
      this.sectionPath,
      instanceId
    );

    if (this.props.label) {
      this.uiConfig = { ...this.uiConfig, label: this.props.label };
    }
    if (this.props.placeholder) {
      this.uiConfig = { ...this.uiConfig, placeholder: this.props.placeholder };
    }
  }

  // ========== ControlValueAccessor Implementation ==========

  writeValue(val: unknown): void {
    this.selectedValues = Array.isArray(val) ? val : [];
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // ========== Dropdown Logic ==========

  toggle(): void {
    if (this.isDisabled) return;
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.searchTerm = '';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      if (this.isOpen) {
        this.isOpen = false;
        this.searchTerm = '';
      }
    }
  }

  toggleOption(option: MnMultiSelectOption): void {
    if (option.disabled) return;

    const index = this.selectedValues.indexOf(option.value);
    if (index > -1) {
      this.selectedValues = this.selectedValues.filter(v => v !== option.value);
    } else {
      if (this.props.maxSelections && this.selectedValues.length >= this.props.maxSelections) {
        return;
      }
      this.selectedValues = [...this.selectedValues, option.value];
    }
    this.onChange(this.selectedValues);
  }

  removeOption(option: MnMultiSelectOption, event: Event): void {
    event.stopPropagation();
    this.selectedValues = this.selectedValues.filter(v => v !== option.value);
    this.onChange(this.selectedValues);
  }

  isSelected(option: MnMultiSelectOption): boolean {
    return this.selectedValues.includes(option.value);
  }

  isMaxReached(option: MnMultiSelectOption): boolean {
    if (!this.props.maxSelections) return false;
    return this.selectedValues.length >= this.props.maxSelections && !this.isSelected(option);
  }

  onSearch(term: string): void {
    this.searchTerm = term;
  }

  get filteredOptions(): MnMultiSelectOption[] {
    if (!this.searchTerm) return this.props.options;
    const lower = this.searchTerm.toLowerCase();
    return this.props.options.filter(o => o.label.toLowerCase().includes(lower));
  }

  get selectedOptions(): MnMultiSelectOption[] {
    return this.props.options.filter(o => this.selectedValues.includes(o.value));
  }

  handleBlur(): void {
    this.onTouched();
  }

  // ========== Error Handling ==========

  get control() {
    return this.ngControl?.control ?? null;
  }

  get showError(): boolean {
    const c = this.control;
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  private pickErrorKey(errors: ValidationErrors): string {
    if (this.props.errorPriority) {
      for (const key of this.props.errorPriority) {
        if (errors[key] !== undefined) {
          return key;
        }
      }
    }
    return Object.keys(errors)[0];
  }

  protected isRequired(): boolean {
    if (!this.control) return false;
    return this.control.hasValidator(Validators.required);
  }

  private resolveErrorMessageForKey(errorKey: string, errors: ValidationErrors): string {
    const errorArgs = errors[errorKey];
    const customMsg = this.props.errorMessages?.[errorKey];
    const useBuiltIn = this.props.useBuiltInErrorMessages !== false;
    const builtInMsg = useBuiltIn ? this.builtInErrorMessages[errorKey] : undefined;
    const fallbackMsg = this.props.defaultErrorMessage;
    const msgDef = customMsg ?? builtInMsg ?? fallbackMsg ?? 'Invalid input';

    if (typeof msgDef === 'function') {
      return msgDef(errorArgs, errors);
    }
    return msgDef;
  }

  get errorMessages(): string[] {
    const errors = this.control?.errors;
    if (!errors) return [];
    return Object.keys(errors).map(key => this.resolveErrorMessageForKey(key, errors));
  }

  get errorMessage(): string | null {
    const errors = this.control?.errors;
    if (!errors) return null;
    const errorKey = this.pickErrorKey(errors);
    return this.resolveErrorMessageForKey(errorKey, errors);
  }

  // ========== Resolved Properties ==========

  get resolvedId(): string {
    return this.props.id;
  }

  get resolvedName(): string | null {
    return this.props?.name ?? null;
  }

  get triggerClasses(): string {
    return mnMultiSelectVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth,
    });
  }
}
