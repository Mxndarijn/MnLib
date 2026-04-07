import { MnCheckboxVariants } from './mn-checkboxVariants';
import { ValidationErrors } from '@angular/forms';

export type MnCheckboxErrorMessageData = string | ((args: any, errors: ValidationErrors) => string);

export type MnCheckboxErrorMessagesData = Partial<Record<string, MnCheckboxErrorMessageData>>;

export interface MnCheckboxProps {
  /** Unique identifier for the checkbox element (required for accessibility) */
  id: string;

  /** Name attribute for the checkbox element (used in form submission) */
  name?: string;

  /** Label text displayed next to the checkbox */
  label?: string;

  // ========== Styling/Variants ==========

  /** Size variant of the checkbox (default: 'md') */
  size?: MnCheckboxVariants['size'];

  /** Border radius variant (default: 'sm') */
  borderRadius?: MnCheckboxVariants['borderRadius'];

  // ========== Error Message Configuration ==========

  /** Custom error messages mapped by validator error key */
  errorMessages?: MnCheckboxErrorMessagesData;

  /** Fallback error message when no specific message is found for an error */
  defaultErrorMessage?: string;

  /** Priority order for displaying errors when multiple validation errors exist */
  errorPriority?: string[];

  /** Whether to use built-in default error messages (default: true) */
  useBuiltInErrorMessages?: boolean;

  /** Whether to display all validation errors or just the first/priority error (default: false) */
  showAllErrors?: boolean;
}

export interface MnCheckboxUIConfig {
  /** Label text displayed next to the checkbox */
  label?: string;

  /** ARIA label for screen readers (falls back to label if not provided) */
  ariaLabel?: string;

  /**
   * Error messages resolved from config (supports $translate markers).
   * These override built-in error messages but are overridden by props.errorMessages.
   */
  errorMessages?: Record<string, string>;
}
