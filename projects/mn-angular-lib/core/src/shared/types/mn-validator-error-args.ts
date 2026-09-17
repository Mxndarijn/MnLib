import {ValidationErrors} from '@angular/forms';

/**
 * Known shapes of Angular validator error argument objects.
 * Covers built-in validators (minlength, maxlength, min, max, pattern)
 * and the library's custom validators (mnMin, mnMax).
 */
export type MnValidationErrorArgs = {
  /** Produced by Validators.minLength / Validators.maxLength */
  requiredLength?: number;
  actualLength?: number;
  /** Produced by Validators.min / Validators.max */
  min?: number | string;
  max?: number | string;
  actual?: number | string;
  /** Produced by Validators.pattern */
  requiredPattern?: string;
  actualValue?: unknown;
};

export type MnErrorMessageFn = (
  args: MnValidationErrorArgs,
  errors: ValidationErrors
) => string;
