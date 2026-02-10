import {Component, inject, InjectionToken, Input, OnInit, Optional, Self} from '@angular/core';
import {NgClass} from '@angular/common';
import {MnTextareaProps, MnTextareaErrorMessageData, MnTextareaUIConfig} from './mn-textareaTypes';
import {NgControl, ValidationErrors, Validators} from '@angular/forms';
import {mnTextareaVariants} from './mn-textareaVariants';
import {MnErrorMessage} from '../mn-error-message/mn-error-message';
import {MnConfigService} from "../../config/mn-config.service";
import {MN_INSTANCE_ID, MN_SECTION_PATH} from "../../context/mn-context.tokens";

export const MN_TEXTAREA_CONFIG = new InjectionToken<MnTextareaUIConfig>('MN_TEXTAREA_CONFIG');

/**
 * MnTextarea Component
 *
 * A flexible, accessible textarea component that implements Angular's ControlValueAccessor
 * and Validator interfaces. Works similarly to MnInputField but uses a textarea element,
 * allowing users to set the height (rows), width (cols), and resize behavior.
 *
 * Features:
 * - Works with Angular Reactive Forms (FormControl, FormGroup)
 * - Configurable rows, cols, and resize behavior
 * - Built-in error messages with internationalization support
 * - Custom error messages per field
 * - Priority-based error display or show all errors
 * - Full accessibility (ARIA attributes)
 *
 * @example
 * ```typescript
 * <mn-textarea
 *   formControlName="description"
 *   [props]="{
 *     id: 'description',
 *     rows: 5,
 *     label: 'Description',
 *     size: 'md',
 *     borderRadius: 'md',
 *     resize: 'vertical',
 *     errorMessages: { required: 'Description is required' }
 *   }"
 * ></mn-textarea>
 * ```
 */
@Component({
  selector: 'mn-lib-textarea',
  standalone: true,
  imports: [NgClass, MnErrorMessage],
  templateUrl: './mn-textarea.html',
})
export class MnTextarea implements OnInit {
  /** Resolved UI configuration for the textarea */
  protected uiConfig: MnTextareaUIConfig = {};

  /** Configuration properties for the textarea */
  @Input({ required: true }) props!: MnTextareaProps;

  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, { optional: true }) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, { optional: true });

  /** Current raw string value of the textarea element */
  value: string | null = null;

  /** Whether the textarea is disabled */
  isDisabled = false;

  /** Callback function to notify Angular forms of value changes */
  private onChange: (val: any) => void = () => {};

  /** Callback function to notify Angular forms when textarea is touched/blurred */
  private onTouched: () => void = () => {};

  /**
   * Built-in default error messages in English.
   * These are used when useBuiltInErrorMessages is true (default).
   * Can be overridden per-field using props.errorMessages.
   */
  private readonly builtInErrorMessages: Record<string, MnTextareaErrorMessageData> = {
    required: 'This field is required',
    minlength: (args: any) => `Minimum ${args.requiredLength} characters required`,
    maxlength: (args: any) => `Maximum ${args.requiredLength} characters allowed`,
  };

  /**
   * Constructor - Registers this component as the ControlValueAccessor
   * for the injected NgControl (FormControl).
   *
   * @param ngControl - Angular's NgControl (injected via Dependency Injection)
   */
  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngOnInit() {
    this.resolveConfig();
  }

  private resolveConfig() {
    const instanceId = this.explicitInstanceId || `mn-textarea-${this.props.id}`;
    this.uiConfig = this.configService.resolve<MnTextareaUIConfig>(
      'mn-textarea',
      this.sectionPath,
      instanceId
    );
  }

  // ========== ControlValueAccessor Implementation ==========

  /**
   * Writes a new value to the textarea element (called by Angular Forms).
   *
   * @param val - The value to write
   */
  writeValue(val: unknown): void {
    this.value = val != null ? String(val) : null;
  }

  /**
   * Registers a callback function to be called when the textarea value changes.
   *
   * @param fn - Callback function to notify Angular Forms of changes
   */
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  /**
   * Registers a callback function to be called when the textarea is touched/blurred.
   *
   * @param fn - Callback function to notify Angular Forms of touch events
   */
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /**
   * Sets the disabled state of the textarea element.
   *
   * @param isDisabled - Whether the textarea should be disabled
   */
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // ========== Event Handlers ==========

  /**
   * Handles input events from the textarea element.
   * Notifies Angular Forms of the new value.
   *
   * @param raw - Raw string value from the textarea element
   */
  handleInput(raw: string): void {
    this.value = raw;
    this.onChange(raw);
  }

  /**
   * Handles blur events from the textarea element.
   * Notifies Angular Forms that the textarea has been touched.
   */
  handleBlur(): void {
    this.onTouched();
  }

  // ========== Error Handling ==========

  /**
   * Gets the FormControl instance from Angular Forms.
   * Returns null if no control is attached.
   */
  get control() {
    return this.ngControl?.control ?? null;
  }

  /**
   * Determines whether to show error messages.
   * Errors are shown when the control is invalid and has been touched or modified.
   */
  get showError(): boolean {
    const c = this.control;
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  /**
   * Picks the error key to display based on errorPriority.
   * Used when showAllErrors is false (default).
   *
   * @param errors - ValidationErrors object from the control
   * @returns The error key to display
   */
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

  /**
   * Resolves a single error message for a specific error key.
   *
   * @param errorKey - The error key (e.g., 'required', 'minlength')
   * @param errors - All validation errors on the control
   * @returns The resolved error message string
   */
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

  /**
   * Gets all error messages for the current control state.
   *
   * @returns Array of error message strings
   */
  get errorMessages(): string[] {
    const errors = this.control?.errors;
    if (!errors) return [];

    const errorKeys = Object.keys(errors);
    return errorKeys.map(key => this.resolveErrorMessageForKey(key, errors));
  }

  /**
   * Gets a single error message for the current control state.
   *
   * @returns Single error message string, or null if no errors
   */
  get errorMessage(): string | null {
    const errors = this.control?.errors;
    if (!errors) return null;

    const errorKey = this.pickErrorKey(errors);
    return this.resolveErrorMessageForKey(errorKey, errors);
  }

  // ========== Resolved Properties ==========

  /** Resolved ID for the textarea element */
  get resolvedId(): string {
    return this.props.id;
  }

  /** Resolved name attribute for the textarea element */
  get resolvedName(): string | null {
    return this.props?.name ?? null;
  }

  /**
   * Computes the CSS classes from tailwind-variants based on the props.
   * Returns the variant classes for styling the textarea element.
   */
  get textareaClasses(): string {
    return mnTextareaVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth,
      resize: this.props.resize,
    });
  }
}
