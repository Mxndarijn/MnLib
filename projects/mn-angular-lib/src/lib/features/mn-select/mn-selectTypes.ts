import {MnSelectVariants} from './mn-selectVariants';
import {MnErrorMessageFn} from '../../shared/types';

export type MnSelectErrorMessageData = string | MnErrorMessageFn;

export type MnSelectErrorMessagesData = Partial<Record<string, MnSelectErrorMessageData>>;

export type MnSelectOption<TValue = unknown> = {
  /** Display label for the option */
  label: string;

  /** Value associated with the option */
  value: TValue;

  /** Whether the option is disabled */
  disabled?: boolean;
}

export type MnSelectProps<TValue = unknown> = {
  /** Unique identifier for the select element (required for accessibility) */
  id: string;

  /** Name attribute for the select element (used in form submission) */
  name?: string;

  /** Label text displayed above the select */
  label?: string;

  /** Placeholder text shown when no option is selected */
  placeholder?: string;

  /** Available options to select from */
  options: MnSelectOption<TValue>[];

  // ========== Styling/Variants ==========

  /** Size variant of the select (default: 'md') */
  size?: MnSelectVariants['size'];

  /** Border radius variant (default: 'md') */
  borderRadius?: MnSelectVariants['borderRadius'];

  /** Shadow variant for the select */
  shadow?: MnSelectVariants['shadow'];

  /** Whether the select should take full width of its container */
  fullWidth?: MnSelectVariants['fullWidth'];

  // ========== Error Message Configuration ==========

  /** Custom error messages mapped by validator error key */
  errorMessages?: MnSelectErrorMessagesData;

  /** Fallback error message when no specific message is found for an error */
  defaultErrorMessage?: string;

  /** Priority order for displaying errors when multiple validation errors exist */
  errorPriority?: string[];

  /** Whether to use built-in default error messages (default: true) */
  useBuiltInErrorMessages?: boolean;

  /** Whether to display all validation errors or just the first/priority error (default: false) */
  showAllErrors?: boolean;
}

export type MnSelectUIConfig = {
  /** Label text displayed above the select */
  label?: string;

  /** Placeholder text shown when no option is selected */
  placeholder?: string;

  /** ARIA label for screen readers (falls back to label if not provided) */
  ariaLabel?: string;

  /**
   * Error messages resolved from config (supports $translate markers).
   * These override built-in error messages but are overridden by props.errorMessages.
   */
  errorMessages?: Record<string, string>;
}
