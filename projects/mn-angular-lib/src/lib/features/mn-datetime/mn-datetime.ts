import {Component, DestroyRef, inject, InjectionToken, Input, OnInit, Optional, Self} from '@angular/core';
import {NgClass} from '@angular/common';
import {MnDatetimeProps, MnDatetimeErrorMessageData, MnDatetimeUIConfig, MnDatetimeMode} from './mn-datetimeTypes';
import {NgControl, ValidationErrors, Validators} from '@angular/forms';
import {mnDatetimeVariants} from './mn-datetimeVariants';
import {MnErrorMessage} from '../mn-error-message/mn-error-message';
import {MnConfigService} from "../../config/mn-config.service";
import {MN_INSTANCE_ID, MN_SECTION_PATH} from "../../context/mn-context.tokens";
import {MnLanguageService} from "../../language/mn-language.service";
import {skip} from "rxjs";

export const MN_DATETIME_CONFIG = new InjectionToken<MnDatetimeUIConfig>('MN_DATETIME_CONFIG');

@Component({
  selector: 'mn-lib-datetime',
  standalone: true,
  imports: [NgClass, MnErrorMessage],
  templateUrl: './mn-datetime.html',
})
export class MnDatetime implements OnInit {
  protected uiConfig: MnDatetimeUIConfig = {};

  @Input({ required: true }) props!: MnDatetimeProps;

  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, { optional: true }) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, { optional: true });
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);

  value: string | null = null;
  isDisabled = false;

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  private readonly builtInErrorMessages: Record<string, MnDatetimeErrorMessageData> = {
    required: 'This field is required',
    mnMin: (args: any) => `Date/time must be from ${args.min} onwards`,
    mnMax: (args: any) => `Date/time must be up to ${args.max}`,
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
    const instanceId = this.explicitInstanceId || `mn-datetime-${this.props.id}`;
    this.uiConfig = this.configService.resolve<MnDatetimeUIConfig>(
      'mn-datetime',
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
    this.value = val != null ? String(val) : null;
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

  handleInput(raw: string): void {
    this.value = raw;
    this.onChange(raw);
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

  get resolvedMode(): MnDatetimeMode {
    return this.props.mode ?? 'datetime-local';
  }

  get inputClasses(): string {
    return mnDatetimeVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth,
    });
  }
}
