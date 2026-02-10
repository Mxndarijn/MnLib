import { MnTextareaVariants } from './mn-textareaVariants';
import { ValidationErrors } from '@angular/forms';

/**
 * Error message definition: either a static string or a function that generates
 * a dynamic message based on validation error arguments.
 *
 * @param args - The error-specific arguments (e.g., { requiredLength: 5 } for minlength)
 * @param errors - All validation errors present on the control
 * @returns The error message string to display
 */
export type MnTextareaErrorMessageData = string | ((args: any, errors: ValidationErrors) => string);

/**
 * Map of error keys to error message definitions.
 * Keys correspond to Angular validator error keys (e.g., 'required', 'minlength')
 * or custom validator keys.
 */
export type MnTextareaErrorMessagesData = Partial<Record<string, MnTextareaErrorMessageData>>;

/**
 * Properties for the MnTextarea component.
 * Contains UI, styling, and error handling configuration.
 */
export interface MnTextareaProps {
  /** Unique identifier for the textarea element (required for accessibility) */
  id: string;

  /** Name attribute for the textarea element (used in form submission) */
  name?: string;

  /** Label text displayed above the textarea */
  label?: string;

  // ========== Textarea-Specific Properties ==========

  /** Number of visible text rows */
  rows?: number;

  /** Number of visible text columns */
  cols?: number;

  // ========== Styling/Variants ==========

  /** Size variant of the textarea (default: 'md') */
  size?: MnTextareaVariants['size'];

  /** Border radius variant (default: 'md') */
  borderRadius?: MnTextareaVariants['borderRadius'];

  /** Shadow variant for the textarea */
  shadow?: MnTextareaVariants['shadow'];

  /** Whether the textarea should take full width of its container */
  fullWidth?: MnTextareaVariants['fullWidth'];

  /** Resize behavior of the textarea (default: 'vertical') */
  resize?: MnTextareaVariants['resize'];

  // ========== Error Message Configuration ==========

  /**
   * Custom error messages mapped by validator error key.
   * Example: { required: 'This field is mandatory' }
   */
  errorMessages?: MnTextareaErrorMessagesData;

  /**
   * Fallback error message when no specific message is found for an error.
   * Default: 'Invalid input'
   */
  defaultErrorMessage?: string;

  /**
   * Priority order for displaying errors when multiple validation errors exist.
   * Only used when showAllErrors is false.
   * Example: ['required', 'minlength']
   */
  errorPriority?: string[];

  /**
   * Whether to use built-in default error messages.
   * Set to false to only use custom errorMessages and defaultErrorMessage.
   * Default: true
   */
  useBuiltInErrorMessages?: boolean;

  /**
   * Whether to display all validation errors or just the first/priority error.
   * - true: Display all error messages present on the control
   * - false: Display only one error based on errorPriority or first error
   * Default: false
   */
  showAllErrors?: boolean;
}

/**
 * Configuration for MnTextarea resolved from MnConfigService.
 * Contains UI properties that can ONLY be set via configuration.
 */
export interface MnTextareaUIConfig {
  /** Label text displayed above the textarea */
  label?: string;

  /** Placeholder text shown inside the textarea when empty */
  placeholder?: string;

  /** ARIA label for screen readers (falls back to label if not provided) */
  ariaLabel?: string;
}
