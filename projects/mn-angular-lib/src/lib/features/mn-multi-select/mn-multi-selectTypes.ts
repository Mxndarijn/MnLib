import { MnMultiSelectVariants } from './mn-multi-selectVariants';
import { ValidationErrors } from '@angular/forms';

export type MnMultiSelectErrorMessageData = string | ((args: any, errors: ValidationErrors) => string);

export type MnMultiSelectErrorMessagesData = Partial<Record<string, MnMultiSelectErrorMessageData>>;

export interface MnMultiSelectOption<TValue = unknown> {
  /** Display label for the option */
  label: string;

  /** Value associated with the option */
  value: TValue;

  /** Whether the option is disabled */
  disabled?: boolean;
}

export interface MnMultiSelectProps<TValue = unknown> {
  /** Unique identifier for the multi-select element (required for accessibility) */
  id: string;

  /** Name attribute for the multi-select element (used in form submission) */
  name?: string;

  /** Label text displayed above the multi-select */
  label?: string;

  /** Placeholder text shown when no options are selected */
  placeholder?: string;

  /** Available options to select from */
  options: MnMultiSelectOption<TValue>[];

  /** Whether to show a search/filter input (default: false) */
  searchable?: boolean;

  /** Placeholder text for the search input */
  searchPlaceholder?: string;

  /** Maximum number of items that can be selected (undefined = unlimited) */
  maxSelections?: number;

  // ========== Styling/Variants ==========

  /** Size variant of the multi-select (default: 'md') */
  size?: MnMultiSelectVariants['size'];

  /** Border radius variant (default: 'md') */
  borderRadius?: MnMultiSelectVariants['borderRadius'];

  /** Shadow variant for the multi-select */
  shadow?: MnMultiSelectVariants['shadow'];

  /** Whether the multi-select should take full width of its container */
  fullWidth?: MnMultiSelectVariants['fullWidth'];

  // ========== Error Message Configuration ==========

  /** Custom error messages mapped by validator error key */
  errorMessages?: MnMultiSelectErrorMessagesData;

  /** Fallback error message when no specific message is found for an error */
  defaultErrorMessage?: string;

  /** Priority order for displaying errors when multiple validation errors exist */
  errorPriority?: string[];

  /** Whether to use built-in default error messages (default: true) */
  useBuiltInErrorMessages?: boolean;

  /** Whether to display all validation errors or just the first/priority error (default: false) */
  showAllErrors?: boolean;
}

export interface MnMultiSelectUIConfig {
  /** Label text displayed above the multi-select */
  label?: string;

  /** Placeholder text shown when no options are selected */
  placeholder?: string;

  /** ARIA label for screen readers (falls back to label if not provided) */
  ariaLabel?: string;

  /**
   * Error messages resolved from config (supports $translate markers).
   * These override built-in error messages but are overridden by props.errorMessages.
   */
  errorMessages?: Record<string, string>;
}
