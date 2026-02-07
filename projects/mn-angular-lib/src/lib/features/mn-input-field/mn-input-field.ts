import {Component, Input, Optional, Self} from '@angular/core';
import {NgClass} from '@angular/common';
import {MnInputProps, MnErrorMessageData} from './mn-input-fieldTypes';
import {AbstractControl, NgControl, ValidationErrors, Validators} from '@angular/forms';
import {pickAdapter} from './mn-input-field-adapters';
import {mnInputFieldVariants} from './mn-input-fieldVariants';
import {MnErrorMessage} from '../mn-error-message/mn-error-message';

/**
 * MnInputField Component
 *
 * A flexible, accessible input field component that implements Angular's ControlValueAccessor
 * and Validator interfaces. Supports multiple input types, custom validation messages,
 * and configurable error display (single or multiple errors).
 *
 * Features:
 * - Works with Angular Reactive Forms (FormControl, FormGroup)
 * - Supports standard and date/time input types
 * - Built-in error messages with internationalization support
 * - Custom error messages per field
 * - Priority-based error display or show all errors
 * - Full accessibility (ARIA attributes)
 * - Type-safe adapter pattern for different input types
 *
 * @example
 * ```typescript
 * <mn-input-field
 *   formControlName="email"
 *   [props]="{
 *     id: 'email',
 *     type: 'email',
 *     label: 'Email Address',
 *     size: 'md',
 *     borderRadius: 'md',
 *     errorMessages: { required: 'Email is required' }
 *   }"
 * ></mn-input-field>
 * ```
 */
@Component({
  selector: 'mn-input-field',
  standalone: true,
  imports: [NgClass, MnErrorMessage],
  templateUrl: './mn-input-field.html',
})
export class MnInputField {
  /** Configuration properties for the input field */
  @Input({ required: true }) props!: MnInputProps;

  /** Current raw string value of the input element */
  value: string | null = null;

  /** Whether the input is disabled */
  isDisabled = false;

  /** Callback function to notify Angular forms of value changes */
  private onChange: (val: any) => void = () => {};

  /** Callback function to notify Angular forms when input is touched/blurred */
  private onTouched: () => void = () => {};

  /**
   * Built-in default error messages in English.
   * These are used when useBuiltInErrorMessages is true (default).
   * Can be overridden per-field using props.errorMessages.
   */
  private readonly builtInErrorMessages: Record<string, MnErrorMessageData> = {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    minlength: (args: any) => `Minimum ${args.requiredLength} characters required`,
    maxlength: (args: any) => `Maximum ${args.requiredLength} characters allowed`,
    mnMin: (args: any) => `Date/time must be from ${args.min} onwards`,
    mnMax: (args: any) => `Date/time must be up to ${args.max}`,
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

  /**
   * Gets the appropriate adapter based on the input type.
   * Adapters handle type-specific formatting, parsing, and validation.
   */
  private get adapter() {
    return pickAdapter(this.props.type);
  }

  // ========== ControlValueAccessor Implementation ==========

  /**
   * Writes a new value to the input element (called by Angular Forms).
   * Formats the value using the type-specific adapter.
   *
   * @param val - The value to write (type depends on input type)
   */
  writeValue(val: unknown): void {
    this.value = this.adapter.format(val);
  }

  /**
   * Registers a callback function to be called when the input value changes.
   *
   * @param fn - Callback function to notify Angular Forms of changes
   */
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  /**
   * Registers a callback function to be called when the input is touched/blurred.
   *
   * @param fn - Callback function to notify Angular Forms of touch events
   */
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /**
   * Sets the disabled state of the input element.
   *
   * @param isDisabled - Whether the input should be disabled
   */
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // ========== Event Handlers ==========

  /**
   * Handles input events from the input element.
   * Parses the raw string value and notifies Angular Forms.
   *
   * @param raw - Raw string value from the input element
   */
  handleInput(raw: string): void {
    this.value = raw;
    this.onChange(this.adapter.parse(raw));
  }

  /**
   * Handles blur events from the input element.
   * Notifies Angular Forms that the input has been touched.
   */
  handleBlur(): void {
    this.onTouched();
  }

  // ========== Validator Implementation ==========

  /**
   * Validates the control using the type-specific adapter.
   * Called by Angular Forms during validation.
   *
   * @param control - The AbstractControl to validate
   * @returns ValidationErrors if invalid, null if valid
   */
  validate(control: AbstractControl): ValidationErrors | null {
    return this.adapter.validate(this.props, control, this.value);
  }

  // ========== Template Attribute Getters ==========

  /**
   * Gets all DOM attributes from the adapter.
   * These are input-type-specific attributes (min, max, step, inputmode).
   */
  get domAttrs() {
    return this.adapter.attrs(this.props);
  }

  /** Min attribute for date/time/number inputs */
  get minAttr() {
    return this.domAttrs.min ?? null;
  }

  /** Max attribute for date/time/number inputs */
  get maxAttr() {
    return this.domAttrs.max ?? null;
  }

  /** Step attribute for number/date/time inputs */
  get stepAttr() {
    return this.domAttrs.step ?? null;
  }

  /** Inputmode attribute for mobile keyboard optimization */
  get inputmodeAttr() {
    return this.domAttrs.inputmode ?? null;
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
    // If priority is specified, use the first matching error from the priority list
    if (this.props.errorPriority) {
      for (const key of this.props.errorPriority) {
        if (errors[key] !== undefined) {
          return key;
        }
      }
    }
    // Otherwise, use the first error key
    return Object.keys(errors)[0];
  }

  protected isRequired(): boolean {
    if (!this.control) return false;
    return this.control.hasValidator(Validators.required);
  }

  /**
   * Resolves a single error message for a specific error key.
   * Checks custom messages, built-in messages, and fallback in order.
   *
   * @param errorKey - The error key (e.g., 'required', 'email')
   * @param errors - All validation errors on the control
   * @returns The resolved error message string
   */
  private resolveErrorMessageForKey(errorKey: string, errors: ValidationErrors): string {
    const errorArgs = errors[errorKey];

    // Priority: custom > built-in > fallback > default
    const customMsg = this.props.errorMessages?.[errorKey];
    const useBuiltIn = this.props.useBuiltInErrorMessages !== false;
    const builtInMsg = useBuiltIn ? this.builtInErrorMessages[errorKey] : undefined;
    const fallbackMsg = this.props.defaultErrorMessage;

    const msgDef = customMsg ?? builtInMsg ?? fallbackMsg ?? 'Invalid input';

    // If the message is a function, call it with error arguments
    if (typeof msgDef === 'function') {
      return msgDef(errorArgs, errors);
    }
    return msgDef;
  }

  /**
   * Gets all error messages for the current control state.
   * Returns an array of error messages (used when showAllErrors is true).
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
   * Uses errorPriority to determine which error to show (when showAllErrors is false).
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

  /** Resolved ID for the input element */
  get resolvedId(): string {
    return this.props.id;
  }

  /** Resolved name attribute for the input element */
  get resolvedName(): string | null {
    return this.props?.name ?? null;
  }

  /**
   * Computes the CSS classes from tailwind-variants based on the props.
   * Returns the variant classes for styling the input element.
   */
  get inputClasses(): string {
    return mnInputFieldVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth,
    });
  }
}
