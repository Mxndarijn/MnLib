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

  /**
   * Whether to show a search/filter input at the top of the panel. When omitted, search
   * auto-enables once the number of options reaches `searchThreshold`, so long lists stay
   * filterable without every call site having to opt in. Set explicitly to force it on or off.
   */
  searchable?: boolean;

  /**
   * Number of options at which the search input auto-enables (default: 8).
   * Ignored when `searchable` is set explicitly.
   */
  searchThreshold?: number;

  /** Placeholder text for the search input */
  searchPlaceholder?: string;

  /**
   * Whether the option panel renders as a bottom sheet on small screens (< 640px).
   * Defaults to true. Set to false to keep the trigger-anchored panel on mobile.
   *
   * The anchored panel sits at the trigger's bottom edge, which puts it directly in
   * the path of the soft keyboard as soon as the search input takes focus. The sheet
   * is anchored to the viewport instead, so the list stays reachable.
   */
  mobileSheet?: boolean;

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

  /** Text shown when no options match the search filter */
  noOptionsFound?: string;

  /** Placeholder and accessible name for the dropdown's search input */
  searchPlaceholder?: string;
}
