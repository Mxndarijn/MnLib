import {Component, DestroyRef, inject, InjectionToken, Input, OnInit, Optional, Self} from '@angular/core';
import {NgClass} from '@angular/common';
import {MnCheckboxProps, MnCheckboxErrorMessageData, MnCheckboxUIConfig} from './mn-checkboxTypes';
import {NgControl, ValidationErrors, Validators} from '@angular/forms';
import {mnCheckboxVariants} from './mn-checkboxVariants';
import {MnErrorMessage} from '../mn-error-message/mn-error-message';
import {MnConfigService} from "../../config/mn-config.service";
import {MN_INSTANCE_ID, MN_SECTION_PATH} from "../../context/mn-context.tokens";
import {MnLanguageService} from "../../language/mn-language.service";
import {skip} from "rxjs";

export const MN_CHECKBOX_CONFIG = new InjectionToken<MnCheckboxUIConfig>('MN_CHECKBOX_CONFIG');

@Component({
  selector: 'mn-lib-checkbox',
  standalone: true,
  imports: [NgClass, MnErrorMessage],
  templateUrl: './mn-checkbox.html',
})
export class MnCheckbox implements OnInit {
  protected uiConfig: MnCheckboxUIConfig = {};

  @Input({ required: true }) props!: MnCheckboxProps;

  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, { optional: true }) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, { optional: true });
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);

  value = false;
  isDisabled = false;

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  private readonly builtInErrorMessages: Record<string, MnCheckboxErrorMessageData> = {
    required: 'This field is required',
  };

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngOnInit() {
    this.resolveConfig();

    const sub = this.lang.locale$.pipe(skip(1)).subscribe(() => {
      this.resolveConfig();
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private resolveConfig() {
    const instanceId = this.explicitInstanceId || `mn-checkbox-${this.props.id}`;
    this.uiConfig = this.configService.resolve<MnCheckboxUIConfig>(
      'mn-checkbox',
      this.sectionPath,
      instanceId
    );

    if (this.props.label) {
      this.uiConfig = { ...this.uiConfig, label: this.props.label };
    }
  }

  // ========== ControlValueAccessor Implementation ==========

  writeValue(val: unknown): void {
    this.value = !!val;
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

  // ========== Event Handlers ==========

  handleChange(checked: boolean): void {
    this.value = checked;
    this.onChange(checked);
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
    const configMsg = this.uiConfig.errorMessages?.[errorKey];
    const useBuiltIn = this.props.useBuiltInErrorMessages !== false;
    const builtInMsg = useBuiltIn ? this.builtInErrorMessages[errorKey] : undefined;
    const fallbackMsg = this.props.defaultErrorMessage;
    const msgDef = customMsg ?? configMsg ?? builtInMsg ?? fallbackMsg ?? 'Invalid input';

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

  get checkboxClasses(): string {
    return mnCheckboxVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
    });
  }
}
