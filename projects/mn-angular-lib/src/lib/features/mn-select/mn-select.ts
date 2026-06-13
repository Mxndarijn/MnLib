import {Component, DestroyRef, inject, InjectionToken, Input, OnInit} from '@angular/core';
import {NgClass} from '@angular/common';
import {MnSelectErrorMessageData, MnSelectOption, MnSelectProps, MnSelectUIConfig} from './mn-selectTypes';
import {NgControl, ValidationErrors, Validators} from '@angular/forms';
import {mnSelectVariants} from './mn-selectVariants';
import {MnErrorMessage} from '../mn-error-message/mn-error-message';
import {MnConfigService} from "../../config";
import {MN_INSTANCE_ID, MN_SECTION_PATH} from "../../context";
import {MnLanguageService} from "../../language";
import {skip} from "rxjs";

export const MN_SELECT_CONFIG = new InjectionToken<MnSelectUIConfig>('MN_SELECT_CONFIG');

@Component({
  selector: 'mn-lib-select',
  standalone: true,
  imports: [NgClass, MnErrorMessage],
  templateUrl: './mn-select.html',
})
export class MnSelect implements OnInit {
  ngControl = inject(NgControl, {optional: true, self: true});

  @Input({required: true}) props!: MnSelectProps;
  /** Currently selected value */
  selectedValue: unknown = null;
  isDisabled = false;
  protected uiConfig: MnSelectUIConfig = {};
  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, {optional: true}) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, {optional: true});
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly builtInErrorMessages: Record<string, MnSelectErrorMessageData> = {
    required: 'Please select an option',
  };

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  get selectedOption(): MnSelectOption | undefined {
    return this.props.options.find(o => o.value === this.selectedValue);
  }

  get control() {
    return this.ngControl?.control ?? null;
  }

  get showError(): boolean {
    const c = this.control;
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  get errorMessages(): string[] {
    const errors = this.control?.errors;
    if (!errors) return [];
    return Object.keys(errors).map(key => this.resolveErrorMessageForKey(key, errors));
  }

  // ========== ControlValueAccessor Implementation ==========

  get errorMessage(): string | null {
    const errors = this.control?.errors;
    if (!errors) return null;
    const errorKey = this.pickErrorKey(errors);
    return this.resolveErrorMessageForKey(errorKey, errors);
  }

  get resolvedId(): string {
    return this.props.id;
  }

  get resolvedName(): string | null {
    return this.props?.name ?? null;
  }

  get selectClasses(): string {
    return mnSelectVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth,
    });
  }

  // ========== Select Logic ==========

  ngOnInit() {
    this.resolveConfig();

    const sub = this.lang.locale$.pipe(skip(1)).subscribe(() => {
      this.resolveConfig();
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  writeValue(val: unknown): void {
    // Treat empty string as null so the placeholder is shown and the control stays properly invalid
    this.selectedValue = (val === '' || val == null) ? null : val;
  }

  registerOnChange(fn: (val: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // ========== Error Handling ==========

  /** Returns the index of an option, used as the <option> value attribute */
  optionIndex(option: MnSelectOption): string {
    return String(this.props.options.indexOf(option));
  }

  /** Handles native select change event */
  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const index = parseInt(target.value, 10);
    if (isNaN(index) || index < 0 || index >= this.props.options.length) {
      this.selectedValue = null;
      this.onChange(null);
      return;
    }
    const option = this.props.options[index];
    if (option.disabled) return;
    this.selectedValue = option.value;
    this.onChange(this.selectedValue);
  }

  isSelected(option: MnSelectOption): boolean {
    return this.selectedValue === option.value;
  }

  handleBlur(): void {
    this.onTouched();
  }

  protected isRequired(): boolean {
    if (!this.control) return false;
    return this.control.hasValidator(Validators.required);
  }

  private onChange: (val: unknown) => void = () => {
  };

  private onTouched: () => void = () => {
  };

  // ========== Resolved Properties ==========

  private resolveConfig() {
    const instanceId = this.explicitInstanceId || `mn-select-${this.props.id}`;
    this.uiConfig = this.configService.resolve<MnSelectUIConfig>(
      'mn-select',
      this.sectionPath,
      instanceId
    );

    if (this.props.label) {
      this.uiConfig = {...this.uiConfig, label: this.props.label};
    }
    if (this.props.placeholder) {
      this.uiConfig = {...this.uiConfig, placeholder: this.props.placeholder};
    }
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

  private resolveErrorMessageForKey(errorKey: string, errors: ValidationErrors): string {
    const errorArgs = errors[errorKey];
    const customMsg = this.props.errorMessages?.[errorKey];
    const configMsg = this.uiConfig.errorMessages?.[errorKey];
    const useBuiltIn = this.props.useBuiltInErrorMessages !== false;
    const builtInMsg = useBuiltIn ? this.builtInErrorMessages[errorKey] : undefined;
    const fallbackMsg = this.props.defaultErrorMessage;
    const msgDef = customMsg ?? configMsg ?? builtInMsg ?? fallbackMsg ?? 'Invalid input';

    if (typeof msgDef === 'function') {
      return msgDef(errorArgs, errors);
    }
    if (errorArgs && typeof errorArgs === 'object') {
      return msgDef.replace(/{{(\w+)}}/g, (_, key) => errorArgs[key] ?? _);
    }
    return msgDef;
  }
}
