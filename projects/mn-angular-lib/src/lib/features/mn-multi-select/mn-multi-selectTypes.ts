import {MnMultiSelectVariants} from './mn-multi-selectVariants';
import {MnErrorMessageFn} from '../../shared/types';

export type MnMultiSelectErrorMessageData = string | MnErrorMessageFn;

export type MnMultiSelectErrorMessagesData = Partial<Record<string, MnMultiSelectErrorMessageData>>;

export type MnMultiSelectOption<TValue = unknown> = {
  /** Display label for the option */
  label: string;

  /** Value associated with the option */
  value: TValue;

  /** Whether the option is disabled */
  disabled?: boolean;
}

export type MnMultiSelectProps<TValue = unknown> = {
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

  // ========== Collapse Summary ==========

  /**
   * Once the number of selected options is strictly greater than this value, the
   * trigger collapses to a single count summary instead of rendering every chip.
   * Opt-in: collapsing is active when this or `collapsePlaceholder` is set. When
   * collapsing is enabled but this is omitted, the effective threshold defaults to 5.
   */
  collapseThreshold?: number;

  /**
   * Summary text shown when the trigger is collapsed. The `{count}` token is
   * replaced with the number of selected options (e.g. `"{count} selected"` →
   * `"18 selected"`). Setting this enables collapsing on its own; when omitted
   * while collapsing is active, `"{count} selected"` is used as the fallback.
   */
  collapsePlaceholder?: string;

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

export type MnMultiSelectUIConfig = {
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

  /** Text shown when no options match the search filter */
  noOptionsFound?: string;
}
