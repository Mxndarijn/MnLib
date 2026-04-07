import { MnDatetimeVariants } from './mn-datetimeVariants';
import { ValidationErrors } from '@angular/forms';

export type MnDatetimeErrorMessageData = string | ((args: any, errors: ValidationErrors) => string);

export type MnDatetimeErrorMessagesData = Partial<Record<string, MnDatetimeErrorMessageData>>;

/**
 * Supported datetime input modes.
 * - 'date': Date only (YYYY-MM-DD)
 * - 'time': Time only (HH:mm)
 * - 'datetime-local': Date and time combined (YYYY-MM-DDTHH:mm)
 */
export type MnDatetimeMode = 'date' | 'time' | 'datetime-local';

export interface MnDatetimeProps {
  /** Unique identifier for the datetime element (required for accessibility) */
  id: string;

  /** Name attribute for the datetime element (used in form submission) */
  name?: string;

  /** Label text displayed above the datetime field */
  label?: string;

  /** Placeholder text (overrides uiConfig.placeholder when provided) */
  placeholder?: string;

  /** Datetime input mode (default: 'datetime-local') */
  mode?: MnDatetimeMode;

  /** Minimum allowed date/time value (ISO 8601 format) */
  min?: string;

  /** Maximum allowed date/time value (ISO 8601 format) */
  max?: string;

  /** Step interval in seconds (e.g., 60 for minute precision, 1 for second precision) */
  step?: number;

  // ========== Styling/Variants ==========

  /** Size variant of the datetime field (default: 'md') */
  size?: MnDatetimeVariants['size'];

  /** Border radius variant (default: 'md') */
  borderRadius?: MnDatetimeVariants['borderRadius'];

  /** Shadow variant for the datetime field */
  shadow?: MnDatetimeVariants['shadow'];

  /** Whether the datetime field should take full width of its container */
  fullWidth?: MnDatetimeVariants['fullWidth'];

  // ========== Error Message Configuration ==========

  /** Custom error messages mapped by validator error key */
  errorMessages?: MnDatetimeErrorMessagesData;

  /** Fallback error message when no specific message is found for an error */
  defaultErrorMessage?: string;

  /** Priority order for displaying errors when multiple validation errors exist */
  errorPriority?: string[];

  /** Whether to use built-in default error messages (default: true) */
  useBuiltInErrorMessages?: boolean;

  /** Whether to display all validation errors or just the first/priority error (default: false) */
  showAllErrors?: boolean;
}

export interface MnDatetimeUIConfig {
  /** Label text displayed above the datetime field */
  label?: string;

  /** Placeholder text shown inside the datetime field when empty */
  placeholder?: string;

  /** ARIA label for screen readers (falls back to label if not provided) */
  ariaLabel?: string;

  /**
   * Error messages resolved from config (supports $translate markers).
   * These override built-in error messages but are overridden by props.errorMessages.
   */
  errorMessages?: Record<string, string>;
}
