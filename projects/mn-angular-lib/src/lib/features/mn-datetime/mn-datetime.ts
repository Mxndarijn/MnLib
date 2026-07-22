import {Component, DestroyRef, inject, InjectionToken, Input, OnInit} from '@angular/core';
import {NgClass, NgTemplateOutlet} from '@angular/common';
import {LucideCalendarDays} from '@lucide/angular';
import {MnDatetimeErrorMessageData, MnDatetimeMode, MnDatetimeProps, MnDatetimeUIConfig} from './mn-datetimeTypes';
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
  imports: [NgClass, NgTemplateOutlet, MnErrorMessage, LucideCalendarDays],
  templateUrl: './mn-datetime.html',
  styles: `
    input::-webkit-calendar-picker-indicator {
      cursor: pointer;
    }

    /*
     * iOS Safari renders native date/time inputs with a large, fixed intrinsic
     * width and largely ignores the CSS box model (width / flex shrinking) while
     * the native appearance is active. In a fullWidth / flex layout this makes the
     * control overflow narrow screens ("too big, doesn't fit") on iPhone, even
     * though Android and desktop honour the width. Resetting the native appearance
     * and clearing the intrinsic min-width lets width:100% take effect so the input
     * shrinks to its container. Scoped to coarse pointers so mouse-driven desktop
     * browsers keep their native calendar-picker indicator untouched.
     */
    @media (pointer: coarse) {
      input[type='date'],
      input[type='datetime-local'],
      input[type='time'],
      input[type='month'],
      input[type='week'] {
        -webkit-appearance: none;
        appearance: none;
        min-width: 0;
        box-sizing: border-box;
      }
    }
  `,
  host: {
    // Native date/time inputs have a platform-specific intrinsic width. Without an
    // explicit host width the inline host collapses to that intrinsic size, so the
    // input's `w-full` (width:100%) resolves against a content-sized box and fails to
    // fill the parent on real mobile devices (desktop devtools hides this because it
    // still renders the control with the desktop engine). Give the host a real width
    // when fullWidth is requested so 100% has something to fill.
    '[style.display]': "props?.fullWidth ? 'block' : null",
    '[style.width]': "props?.fullWidth ? '100%' : null",
  },
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
    mnMin: (args) => `Date/time must be from ${args.min} onwards`,
    mnMax: (args) => `Date/time must be up to ${args.max}`,
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

  handleClick(input: HTMLInputElement): void {
    try {
      input.showPicker();
    } catch {
      // picker already open (icon click) or browser restriction
    }
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

  /** Whether the control renders as an icon-only button rather than a full input. */
  get iconOnly(): boolean {
    return this.props.iconOnly === true;
  }

  /**
   * Accessible name for the input. Prefers an explicit ariaLabel/label; for the
   * icon-only variant — which has no visible text — it falls back to the
   * placeholder so the button is never left unnamed.
   */
  get resolvedAriaLabel(): string | null {
    const explicit = this.uiConfig.ariaLabel || this.uiConfig.label || this.props.label;
    if (explicit) return explicit;
    return this.iconOnly ? (this.uiConfig.placeholder || this.props.placeholder || null) : null;
  }

  /** Lucide icon size (px) tracking the field size, used only in the icon-only variant. */
  get iconSize(): number {
    if (this.props.size === 'sm') return 16;
    if (this.props.size === 'lg') return 20;
    return 18;
  }

  get inputClasses(): string {
    // Icon-only: the input becomes a transparent click target filling the icon box,
    // which carries the visible styling. `iconBoxClasses` provides the box itself.
    if (this.iconOnly) {
      return 'absolute inset-0 h-full w-full cursor-pointer opacity-0';
    }
    return mnDatetimeVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth,
      hover: this.props.hover,
    });
  }

  /**
   * Classes for the icon-only box: the same border/background/radius/hover the full
   * input would wear (reused from the variant), made a positioning context for the
   * overlaid input, with a `focus-within` ring standing in for the transparent
   * input's own focus outline.
   */
  get iconBoxClasses(): string {
    return [
      mnDatetimeVariants({
        size: this.props.size,
        borderRadius: this.props.borderRadius,
        shadow: this.props.shadow,
        hover: this.props.hover,
      }),
      'relative inline-flex items-center justify-center text-base-content/70',
      'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary',
    ].join(' ');
  }
}
