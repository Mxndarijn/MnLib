import {ColumnDefinition, ColumnFilterType, ColumnFilterValue} from './mn-table.types';

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
    case 'boolean':
    case 'text':
    case 'select':
    default:
      return '';
  }
}

/**
 * Whether a filter value should actually narrow the rows. Empty strings and
 * empty arrays are inactive; `false` on a boolean filter is active (it means
 * "show only the false rows"), which is why a plain truthiness check is not
 * enough.
 */
export function isFilterValueActive(value: ColumnFilterValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  return Array.isArray(value) && value.length > 0;
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

/**
 * The default predicate for a filter type, used when the column supplies no
 * `filterFn`. Semantics per type:
 * - `text` — case-insensitive substring match
 * - `select` — exact string equality
 * - `multi-select` — equality against any selected value (OR)
 * - `boolean` — truthiness of the raw value equals the chosen state
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
