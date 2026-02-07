import { MnInputVariants } from './mn-input-fieldVariants';
import { ValidationErrors } from '@angular/forms';

/**
 * Supported input types for the MnInputField component.
 * Includes standard text inputs, specialized inputs (email, tel, url),
 * and date/time inputs.
 */
export type MnInputType =
  | 'text'
  | 'email'
  | 'password'
  | 'search'
  | 'tel'
  | 'url'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime-local';

/**
 * Error message definition: either a static string or a function that generates
 * a dynamic message based on validation error arguments.
 *
 * @param args - The error-specific arguments (e.g., { requiredLength: 5 } for minlength)
 * @param errors - All validation errors present on the control
 * @returns The error message string to display
 */
export type MnErrorMessage = string | ((args: any, errors: ValidationErrors) => string);

/**
 * Map of error keys to error message definitions.
 * Keys correspond to Angular validator error keys (e.g., 'required', 'email', 'minlength')
 * or custom validator keys.
 */
export type MnErrorMessages = Partial<Record<string, MnErrorMessage>>;

/**
 * Base properties for all MnInputField variants.
 * Contains common UI, styling, and error handling configuration.
 */
export interface MnInputBaseProps {
  /** Unique identifier for the input element (required for accessibility) */
  id: string;

  /** Name attribute for the input element (used in form submission) */
  name?: string;

  /** Type of input field (text, email, date, etc.) */
  type: MnInputType;

  // ========== UI Properties ==========

  /** Label text displayed above the input field */
  label?: string;

  /** Placeholder text shown inside the input when empty */
  placeholder?: string;

  /** ARIA label for screen readers (falls back to label if not provided) */
  ariaLabel?: string;

  // ========== Styling/Variants ==========

  /** Size variant of the input field (default: 'md') */
  size?: MnInputVariants['size'];

  /** Border radius variant (default: 'md') */
  borderRadius?: MnInputVariants['borderRadius'];

  /** Shadow variant for the input field */
  shadow?: MnInputVariants['shadow'];

  /** Whether the input should take full width of its container */
  fullWidth?: MnInputVariants['fullWidth'];

  // ========== Error Message Configuration ==========

  /**
   * Custom error messages mapped by validator error key.
   * Example: { required: 'This field is mandatory', email: 'Invalid email format' }
   */
  errorMessages?: MnErrorMessages;

  /**
   * Fallback error message when no specific message is found for an error.
   * Default: 'Invalid input'
   */
  defaultErrorMessage?: string;

  /**
   * Priority order for displaying errors when multiple validation errors exist.
   * Only used when showAllErrors is false.
   * Example: ['required', 'email', 'minlength']
   * If not provided, the first error key will be displayed.
   */
  errorPriority?: string[];

  /**
   * Whether to use built-in default error messages.
   * Set to false to only use custom errorMessages and defaultErrorMessage.
   * Default: true (backwards compatible)
   */
  useBuiltInErrorMessages?: boolean;

  /**
   * Whether to display all validation errors or just the first/priority error.
   * - true: Display all error messages present on the control
   * - false: Display only one error based on errorPriority or first error
   * Default: false (backwards compatible - show single error)
   */
  showAllErrors?: boolean;
}

/**
 * Properties for standard input fields (text, email, password, tel, url, number, search).
 * Excludes date/time input types which have additional properties.
 */
export interface MnInputFieldProps extends MnInputBaseProps {
  type: Exclude<MnInputType, 'date' | 'time' | 'datetime-local'>;
}

/**
 * Properties for date/time input fields.
 * Includes additional date range validation properties.
 */
export interface MnInputDateTimeProps extends MnInputBaseProps {
  type: Extract<MnInputType, 'date' | 'time' | 'datetime-local'>;

  /** Minimum allowed date/time value (ISO 8601 format) */
  startDate?: string;

  /** Maximum allowed date/time value (ISO 8601 format) */
  endDate?: string;
}

/**
 * Union type of all possible input field property configurations.
 * Use this type when accepting props in components or functions.
 */
export type MnInputProps = MnInputFieldProps | MnInputDateTimeProps;
