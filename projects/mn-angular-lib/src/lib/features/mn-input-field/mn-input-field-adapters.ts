/**
 * MnInputField Adapters
 *
 * This module implements the Adapter Pattern to handle type-specific behavior
 * for different HTML input types in the MnInputField component.
 *
 * The adapter pattern allows the component to support multiple input types
 * (text, number, date, time, etc.) without coupling the component logic to
 * type-specific implementations. Each adapter handles:
 * - Parsing: converting raw string input to the appropriate data type
 * - Formatting: converting typed values back to string for display
 * - Attributes: providing type-specific DOM attributes (min, max, step, inputmode)
 * - Validation: implementing type-specific validation rules
 *
 * This approach keeps the component code clean and makes it easy to add
 * support for new input types by creating new adapters.
 */

import { AbstractControl, ValidationErrors } from '@angular/forms';
import { MnInputDateTimeProps, MnInputProps, MnInputType } from './mn-input-fieldTypes';

/**
 * DOM attributes that can be dynamically set on input elements.
 * These attributes are type-specific and provided by adapters.
 */
export type MnDomAttrs = {
  /** Minimum value for date/time/number inputs */
  min?: string | null;
  /** Maximum value for date/time/number inputs */
  max?: string | null;
  /** Step increment for number/date/time inputs */
  step?: string | null;
  /** Mobile keyboard hint (e.g., 'decimal' for number inputs) */
  inputmode?: string | null;
};

/**
 * Adapter interface for handling input type-specific behavior.
 *
 * Each adapter implementation defines how to handle a specific input type
 * (or group of related types) throughout the component lifecycle.
 *
 * @template TOut - The output type after parsing (e.g., string | null, number | null)
 */
export interface MnInputAdapter<TOut = string | null> {
  /**
   * Parses the raw string value from the input element into the typed value
   * that will be sent to the FormControl.
   *
   * @param raw - Raw string value from the input element
   * @returns Typed value to store in the FormControl
   *
   * @example
   * // Text adapter
   * parse('hello') // => 'hello'
   * parse('') // => null
   *
   * // Number adapter
   * parse('42') // => 42
   * parse('') // => null
   * parse('abc') // => null
   */
  parse(raw: string): TOut;

  /**
   * Formats the typed value from the FormControl into a string
   * that will be displayed in the input element.
   *
   * @param val - Typed value from the FormControl
   * @returns String representation for the input element's value attribute
   *
   * @example
   * // Text adapter
   * format('hello') // => 'hello'
   * format(null) // => ''
   *
   * // Number adapter
   * format(42) // => '42'
   * format(null) // => ''
   */
  format(val: unknown): string;

  /**
   * Returns type-specific DOM attributes for the input element.
   * These attributes are applied dynamically based on the input type and props.
   *
   * @param props - Input field properties
   * @returns Object containing DOM attributes (min, max, step, inputmode)
   *
   * @example
   * // Date adapter with date range
   * attrs({ startDate: '2024-01-01', endDate: '2024-12-31' })
   * // => { min: '2024-01-01', max: '2024-12-31' }
   *
   * // Number adapter
   * attrs({}) // => { inputmode: 'decimal' }
   */
  attrs(props: MnInputProps): MnDomAttrs;

  /**
   * Performs type-specific validation on the current input value.
   * This validation runs in addition to Angular's built-in validators.
   *
   * @param props - Input field properties (may contain validation constraints)
   * @param control - The AbstractControl being validated
   * @param currentRaw - Current raw string value from the input element
   * @returns ValidationErrors object if invalid, null if valid
   *
   * @example
   * // Date adapter validation
   * validate(props, control, '2024-06-15')
   * // Returns { mnMin: { min: '2024-07-01', actual: '2024-06-15' } }
   * // if startDate is '2024-07-01'
   */
  validate(props: MnInputProps, control: AbstractControl, currentRaw: string | null): ValidationErrors | null;
}

/**
 * Utility function to convert empty strings to null.
 * This is a common pattern for optional form fields where empty input
 * should be treated as "no value" rather than an empty string.
 *
 * @param raw - Raw input string
 * @returns The input string if non-empty, null if empty
 *
 * @example
 * emptyToNull('hello') // => 'hello'
 * emptyToNull('') // => null
 */
const emptyToNull = (raw: string): string | null => (raw === '' ? null : raw);

/**
 * Default adapter for text-based input types.
 * Used for: text, email, password, search, tel, url
 *
 * Behavior:
 * - Empty strings are converted to null
 * - Values are stored as strings in the FormControl
 * - No special DOM attributes
 * - No additional validation (relies on Angular's built-in validators)
 */
export const defaultTextAdapter: MnInputAdapter<string | null> = {
  parse: (raw) => emptyToNull(raw),
  format: (val) => (val == null ? '' : String(val)),
  attrs: () => ({}),
  validate: () => null,
};

/**
 * Adapter for date and time input types.
 * Used for: date, time, datetime-local
 *
 * Behavior:
 * - Empty strings are converted to null
 * - Values are stored as ISO 8601 strings in the FormControl
 * - Provides min/max attributes from startDate/endDate props
 * - Validates date/time ranges using string comparison
 *
 * Note: String comparison works for ISO 8601 dates/times because they are
 * lexicographically ordered (e.g., '2024-01-15' < '2024-12-31').
 */
export const dateTimeAdapter: MnInputAdapter<string | null> = {
  parse: (raw) => emptyToNull(raw),
  format: (val) => (val == null ? '' : String(val)),
  attrs: (props) => ({
    min: (props as MnInputDateTimeProps).startDate ?? null,
    max: (props as MnInputDateTimeProps).endDate ?? null,
  }),
  validate: (props, _control, currentRaw) => {
    const value = currentRaw;
    if (!value) return null; // Don't validate empty values (use 'required' validator for that)

    const min = (props as MnInputDateTimeProps).startDate as string | undefined;
    const max = (props as MnInputDateTimeProps).endDate as string | undefined;

    // Validate minimum date/time constraint
    if (min && value < min) {
      return { mnMin: { min, actual: value } };
    }

    // Validate maximum date/time constraint
    if (max && value > max) {
      return { mnMax: { max, actual: value } };
    }

    return null;
  },
};

/**
 * Adapter for number input type.
 *
 * Behavior:
 * - Empty strings are converted to null
 * - Valid numbers are parsed to number type
 * - Invalid numbers (NaN, Infinity) are converted to null
 * - Values are stored as numbers (or null) in the FormControl
 * - Sets inputmode='decimal' for optimized mobile keyboards
 * - No additional validation (relies on Angular's built-in validators)
 *
 * Note: The browser's native number input validation handles
 * basic number format validation automatically.
 */
export const numberAdapter: MnInputAdapter<number | null> = {
  parse: (raw) => {
    if (raw === '') return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  },
  format: (val) => (val == null ? '' : String(val)),
  attrs: () => ({
    inputmode: 'decimal',
  }),
  validate: () => null,
};

/**
 * Selects the appropriate adapter based on the input type.
 * This is the main factory function used by the MnInputField component
 * to determine which adapter to use for a given input type.
 *
 * @param type - The input type (e.g., 'text', 'email', 'date', 'number')
 * @returns The appropriate adapter instance
 *
 * @example
 * pickAdapter('text') // => defaultTextAdapter
 * pickAdapter('email') // => defaultTextAdapter
 * pickAdapter('date') // => dateTimeAdapter
 * pickAdapter('number') // => numberAdapter
 */
export function pickAdapter(type: MnInputType): MnInputAdapter<any> {
  // Date/time inputs use the dateTimeAdapter for range validation
  if (type === 'date' || type === 'time' || type === 'datetime-local') {
    return dateTimeAdapter;
  }

  // Number inputs use the numberAdapter for type conversion
  if (type === 'number') {
    return numberAdapter;
  }

  // All other input types use the default text adapter
  return defaultTextAdapter;
}
