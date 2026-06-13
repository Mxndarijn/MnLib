import {Component, DestroyRef, inject, InjectionToken, Input, OnInit} from '@angular/core';
import {NgClass} from '@angular/common';
import {MnDatetimeProps, MnDatetimeErrorMessageData, MnDatetimeUIConfig, MnDatetimeMode} from './mn-datetimeTypes';
import {NgControl, ValidationErrors, Validators} from '@angular/forms';
import {mnDatetimeVariants} from './mn-datetimeVariants';
import {MnErrorMessage} from '../mn-error-message/mn-error-message';
import {MnConfigService} from "../../config";
import {MN_INSTANCE_ID, MN_SECTION_PATH} from "../../context";
import {MnLanguageService} from "../../language";
import {skip} from "rxjs";

export const MN_DATETIME_CONFIG = new InjectionToken<MnDatetimeUIConfig>('MN_DATETIME_CONFIG');

@Component({
  selector: 'mn-lib-datetime',
  standalone: true,
  imports: [NgClass, MnErrorMessage],
  templateUrl: './mn-datetime.html',
})
export class MnDatetime implements OnInit {
  ngControl = inject(NgControl, {optional: true, self: true});

  protected uiConfig: MnDatetimeUIConfig = {};

  @Input({ required: true }) props!: MnDatetimeProps;

  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, { optional: true }) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, { optional: true });
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);

  value: string | null = null;
  isDisabled = false;

  private onChange: (val: unknown) => void = () => {
  };
  private onTouched: () => void = () => {};

  private readonly builtInErrorMessages: Record<string, MnDatetimeErrorMessageData> = {
    required: 'This field is required',
    mnMin: (args: unknown) => `Date/time must be from ${(args as { min: string }).min} onwards`,
    mnMax: (args: unknown) => `Date/time must be up to ${(args as { max: string }).max}`,
  };

  constructor() {
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
    if (val != null) {
      let str = String(val);
      // Convert ISO 8601 strings (e.g. "2025-01-01T10:00:00.000Z") to datetime-local format
      if (str.includes('T') && (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str))) {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          const pad = (n: number) => n.toString().padStart(2, '0');
          str = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }
      }
      this.value = str;
    } else {
      this.value = null;
    }
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

  get resolvedMode(): MnDatetimeMode {
    return this.props.mode ?? 'datetime-local';
  }

  get inputClasses(): string {
    return mnDatetimeVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth,
      hover: this.props.hover,
    });
  }
}
