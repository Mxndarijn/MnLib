import {
  ColumnDefinition,
  ColumnFilterType,
  ColumnFilterValue,
  DateRangeFilterValue,
  NumberRangeFilterValue,
} from './mn-table.types';

/**
 * Pure helpers backing mn-table's per-column filters: the empty value and
 * "is it set?" test for each filter type, and the default client-side predicate
 * applied when a column supplies no `filterFn`.
 *
 * Kept free of Angular so the filter semantics can be unit-tested directly.
 */

/** The reset/unset value for a filter type. */
export function emptyFilterValue(type: ColumnFilterType): ColumnFilterValue {
  switch (type) {
    case 'multi-select':
      return [];
    case 'number-range':
      return {} as NumberRangeFilterValue;
    case 'date-range':
      return {} as DateRangeFilterValue;
    case 'boolean':
    case 'text':
    case 'select':
    default:
      return '';
  }
}

/**
 * Whether a filter value should actually narrow the rows. Empty strings, empty
 * arrays and ranges with neither bound set are inactive; `false` on a boolean
 * filter is active (it means "show only the false rows"), which is why a plain
 * truthiness check is not enough.
 */
export function isFilterValueActive(value: ColumnFilterValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  const range = value as NumberRangeFilterValue & DateRangeFilterValue;
  return [range.min, range.max, range.from, range.to].some(
    bound => bound !== undefined && bound !== null && bound !== '' && !Number.isNaN(bound as number),
  );
}

/**
 * The value a filter compares against for a row: the column's
 * `getRawValueToSort` when present (the only option for template cells, which
 * have no string to read), otherwise the rendered cell string.
 */
export function resolveFilterableValue<T>(column: ColumnDefinition<T>, row: T): unknown {
  if (column.getRawValueToSort) return column.getRawValueToSort(row);
  if (typeof column.cell === 'function') return column.cell(row);
  return '';
}

/** Parses a `YYYY-MM-DD` bound to a timestamp; `endOfDay` makes the upper bound inclusive. */
function parseDateBound(bound: string | undefined, endOfDay: boolean): number | undefined {
  if (!bound) return undefined;
  const time = new Date(endOfDay ? `${bound}T23:59:59.999` : `${bound}T00:00:00.000`).getTime();
  return Number.isNaN(time) ? undefined : time;
}

/** Coerces a raw cell value to a timestamp for date-range comparison. */
function toTimestamp(raw: unknown): number {
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === 'number') return raw;
  return new Date(String(raw)).getTime();
}

/**
 * The default predicate for a filter type, used when the column supplies no
 * `filterFn`. Semantics per type:
 * - `text` — case-insensitive substring match
 * - `select` — exact string equality
 * - `multi-select` — equality against any selected value (OR)
 * - `boolean` — truthiness of the raw value equals the chosen state
 * - `number-range` / `date-range` — inclusive bounds, each side optional
 *
 * A row whose raw value cannot be interpreted for the type (a non-numeric value
 * under a number range, an unparsable date) is excluded rather than kept, so an
 * active filter never silently passes rows it cannot evaluate.
 */
export function defaultFilterPredicate(
  type: ColumnFilterType,
  raw: unknown,
  value: ColumnFilterValue,
): boolean {
  switch (type) {
    case 'select':
      return String(raw ?? '') === String(value);

    case 'multi-select': {
      const selected = value as string[];
      return selected.some(option => String(raw ?? '') === option);
    }

    case 'boolean':
      return Boolean(raw) === value;

    case 'number-range': {
      const {min, max} = value as NumberRangeFilterValue;
      const numeric = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isNaN(numeric)) return false;
      if (min !== undefined && numeric < min) return false;
      return !(max !== undefined && numeric > max);
    }

    case 'date-range': {
      const {from, to} = value as DateRangeFilterValue;
      const time = toTimestamp(raw);
      if (Number.isNaN(time)) return false;
      const start = parseDateBound(from, false);
      const end = parseDateBound(to, true);
      if (start !== undefined && time < start) return false;
      return !(end !== undefined && time > end);
    }

    case 'text':
    default:
      return String(raw ?? '')
        .toLowerCase()
        .includes(String(value).trim().toLowerCase());
  }
}

/**
 * Whether a row passes a column's active filter — the column's own `filterFn`
 * when it has one, otherwise {@link defaultFilterPredicate}.
 *
 * `filterFn` is declared per filter type on {@link ColumnDefinition}, so at this
 * generic call site the union of signatures is not callable and the value shape
 * is widened once here. Consumers keep the precise per-type signature where they
 * declare the column, which is where it matters.
 */
export function matchesColumnFilter<T>(
  column: ColumnDefinition<T>,
  row: T,
  value: ColumnFilterValue,
): boolean {
  const filterFn = column.filterFn as ((row: T, filterValue: ColumnFilterValue) => boolean) | undefined;
  if (filterFn) return filterFn(row, value);
  return defaultFilterPredicate(column.filterType ?? 'text', resolveFilterableValue(column, row), value);
}
