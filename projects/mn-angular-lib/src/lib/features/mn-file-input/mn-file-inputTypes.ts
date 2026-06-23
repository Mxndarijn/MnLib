import {MnFileInputVariants} from './mn-file-inputVariants';
import {MnErrorMessageFn} from '../../shared/types';

/** A single error message definition: a static string or a function of the error args. */
export type MnFileInputErrorMessageData = string | MnErrorMessageFn;

/**
 * Map of error keys to error message definitions.
 * Keys correspond to the component's selection errors (`accept`, `maxSize`,
 * `maxFiles`) or the attached control's validator keys (e.g. `required`).
 */
export type MnFileInputErrorMessagesData = Partial<Record<string, MnFileInputErrorMessageData>>;

/**
 * Controls how the selected file(s) are presented.
 * - `dropzone` — large dashed drop area with icon + hint, previews/rows below (default).
 * - `thumbnail` — grid of image tiles (file icon for non-images), with an add tile.
 * - `list` — compact rows of file icon + name + size + remove.
 * - `compact` — inline styled button + current filename + remove.
 */
export type MnFileInputDisplayMode = 'dropzone' | 'thumbnail' | 'list' | 'compact';

/**
 * Configuration properties for the {@link MnFileInput} component.
 * Passed as a single required `props` object, mirroring the other input components.
 */
export type MnFileInputProps = {
  /** Unique identifier for the input element (required for accessibility). */
  id: string;

  /** Name attribute for the underlying file input. */
  name?: string;

  /** Label text shown above the control (overrides config when provided). */
  label?: string;

  /** Hint shown inside the empty dropzone (overrides config when provided). */
  dropzoneHint?: string;

  /** Label for the "choose/replace file" affordance (overrides config when provided). */
  replaceLabel?: string;

  /** Accessible label for the per-file remove button (overrides config when provided). */
  removeLabel?: string;

  /**
   * Accepted file types, forwarded to the native `accept` attribute and
   * re-validated on selection (e.g. `image/*`, `.pdf,.docx`). When unset, all
   * file types are allowed.
   */
  accept?: string;

  /** Allow selecting more than one file. Changes the value shape to `File[]`. */
  multiple?: boolean;

  /** Maximum number of files retained (only meaningful when `multiple` is true). */
  maxFiles?: number;

  /** Maximum size per file in bytes; larger files are rejected. */
  maxSize?: number;

  /** How the selection is rendered. Defaults to `dropzone`. */
  displayMode?: MnFileInputDisplayMode;

  /**
   * URL of an already-saved image to preview when no new file is selected
   * (single mode). Cleared when the user removes it; surfaced via `cleared`.
   */
  currentUrl?: string | null;

  /** URLs of already-saved images to preview when nothing is selected (multiple mode). */
  currentUrls?: string[] | null;

  /** Disables the control. */
  disabled?: boolean;

  // ========== Styling/Variants ==========

  /** Size variant of the control (default: `md`). */
  size?: MnFileInputVariants['size'];

  /** Border radius variant (default: `lg`). */
  borderRadius?: MnFileInputVariants['borderRadius'];

  /** Shadow variant for the control. */
  shadow?: MnFileInputVariants['shadow'];

  /** Whether the control should take the full width of its container. */
  fullWidth?: MnFileInputVariants['fullWidth'];

  // ========== Error Message Configuration ==========

  /** Custom error messages mapped by error key (overrides config and built-ins). */
  errorMessages?: MnFileInputErrorMessagesData;

  /** Fallback message when no specific message is found for an error. */
  defaultErrorMessage?: string;

  /** Priority order for displaying control errors when several exist. */
  errorPriority?: string[];

  /** Whether to use the built-in default error messages (default: true). */
  useBuiltInErrorMessages?: boolean;

  /** Display every control error instead of just the first/priority one (default: false). */
  showAllErrors?: boolean;
};

/**
 * UI strings resolved from {@link MnConfigService} for the file input.
 * These can only be set via configuration (or the matching `props` overrides).
 */
export type MnFileInputUIConfig = {
  /** Label text displayed above the control. */
  label?: string;

  /** ARIA label for screen readers (falls back to label). */
  ariaLabel?: string;

  /** Hint shown inside the empty dropzone. */
  dropzoneHint?: string;

  /** Label for the "choose/replace file" affordance. */
  replaceLabel?: string;

  /** Accessible label for the per-file remove button. */
  removeLabel?: string;

  /** Error messages resolved from config (override built-ins, overridden by props). */
  errorMessages?: Record<string, string>;
};
