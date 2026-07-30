import {TemplateRef} from '@angular/core';
import {MnSkeletonProps} from '../mn-skeleton';
import {MnCollectionLabels, MnSelectableCollectionDataSource} from '../mn-collection';

// ── Column Sort Type ──
export enum ColumnSortType {
  ALPHABETICAL = 'ALPHABETICAL',
  NUMERICAL = 'NUMERICAL',
  DATE = 'DATE',
  NONE = 'NONE',
}

// ── Sort State ──
export type SortState = {
  columnKey: string;
  direction: 'asc' | 'desc';
}

// ── Appearance ──
export type TableAppearance = {
  striped?: boolean;
  hover?: boolean;
  compact?: boolean;
  bordered?: boolean;
  /**
   * How column widths are computed. Defaults to `stable`.
   *
   * - `stable` (default): the best of both. The first render with rows on screen
   *   uses the browser's automatic layout, so each column is sized in proportion to
   *   its real content; those measured widths are then pinned and the table switches
   *   to a fixed layout. Columns therefore keep sensible, content-derived
   *   proportions **and** stop moving when the rows change underneath — a new page,
   *   a filter or a search cannot resize them. Widths are re-measured only when the
   *   table itself is resized (or a {@link ColumnBase.hiddenBelow} column appears or
   *   disappears), never when the rows change. Content that no longer fits is
   *   truncated with an ellipsis and exposed as a `title` tooltip.
   * - `auto`: the plain browser layout. Every column is re-sized to its widest cell
   *   on every change, so the columns shift on each new page, filter and search.
   *   Use it for a static table, or when a cell must never be truncated.
   * - `fixed`: widths are **data-independent**. Nothing is measured — not the cell
   *   content, and not the header text either. Each column is either its declared
   *   {@link ColumnBase.width} or an even share of whatever is left over:
   *   `(table width − Σ declared widths) ÷ number of undeclared visible columns`.
   *   Only worth choosing over `stable` when every column declares a `width`, or
   *   when a deliberate even split is what you want: with widths undeclared, a
   *   two-character status column is handed exactly as much room as a long
   *   description.
   */
  layout?: 'auto' | 'fixed' | 'stable';
}

// ── Column Filter Type ──
/**
 * The control rendered for a column filter, and the shape of the value it produces:
 * - `text` → `string` (free-text, debounced)
 * - `select` → `string` (single choice; empty string means "no filter")
 * - `multi-select` → `string[]` (OR semantics across the chosen values)
 * - `boolean` → `boolean` (tri-state: any / true / false)
 * - `number-range` → {@link NumberRangeFilterValue}
 * - `date-range` → {@link DateRangeFilterValue}
 */
export type ColumnFilterType =
  | 'text'
  | 'select'
  | 'multi-select'
  | 'boolean'
  | 'number-range'
  | 'date-range';

// ── Column Filter Option ──
export type ColumnFilterOption = {
  label: string;
  value: string;
}

// ── Column Filter Values ──
/** Inclusive numeric bounds; either side may be omitted for an open-ended range. */
export type NumberRangeFilterValue = {
  min?: number;
  max?: number;
}

/**
 * Inclusive date bounds as `YYYY-MM-DD` strings (the format the underlying
 * date control emits); either side may be omitted for an open-ended range.
 */
export type DateRangeFilterValue = {
  from?: string;
  to?: string;
}

/** Every value shape a column filter can hold, discriminated by {@link ColumnFilterType}. */
export type ColumnFilterValue =
  | string
  | string[]
  | boolean
  | NumberRangeFilterValue
  | DateRangeFilterValue;

/** Map of column key to its current filter value. */
export type ColumnFilterState = Record<string, ColumnFilterValue | undefined>;

/**
 * One active column filter, as handed to
 * {@link TableDataSource.onColumnFilterChange}. Only columns whose filter is
 * actually set are included, so the array maps straight onto query params.
 */
export type MnColumnFilter = {
  key: string;
  type: ColumnFilterType;
  value: ColumnFilterValue;
}

// ── Column Skeleton ──
/**
 * Customizes the loading-skeleton placeholder rendered in a column's cells.
 * Either a partial {@link MnSkeletonProps} (shape/width/height/animated) or a
 * `TemplateRef` for a fully custom placeholder. When omitted, a text-shaped
 * skeleton at 75% width is used (matching the previous default).
 */
export type ColumnSkeleton = Partial<MnSkeletonProps> | TemplateRef<unknown>;

// ── Column Definition ──
/** Everything about a column that is independent of filtering. */
export type ColumnBase<T> = {
  key: string;
  header: string | TemplateRef<unknown>;
  /** Translation key for the column header. When set, mn-table resolves it via MnLanguageService and keeps it updated on locale change. */
  headerKey?: string;
  cell: ((row: T) => string) | TemplateRef<unknown>;
  /** Alternative cell renderer shown below the given breakpoint. When set, `cell` is hidden below this breakpoint and `cellSm` is shown instead. */
  cellSm?: { below: 'sm' | 'md' | 'lg'; cell: ((row: T) => string) | TemplateRef<unknown> };
  sortType?: ColumnSortType;
  getRawValueToSort?: (row: T) => unknown;
  width?: string;
  align?: 'left' | 'center' | 'right';
  hiddenBelow?: 'sm' | 'md' | 'lg';
  /** Customizes the loading-skeleton placeholder shown in this column's cells while data loads. */
  skeleton?: ColumnSkeleton;
}

/** Filter presentation props shared by every filterable column. */
type ColumnFilterCommon = {
  /** Whether this column supports per-column filtering. */
  filterable: true;
  /** Placeholder text for the filter input. For `select`, it also labels the "no filter" option. */
  filterPlaceholder?: string;
  /** Translation key for the filter placeholder. When set, mn-table resolves it via MnLanguageService. */
  filterPlaceholderKey?: string;
  /** Whether the filter input is disabled. */
  filterDisabled?: boolean;
  /** Autocomplete attribute for the filter input. */
  filterAutocomplete?: string;
}

/**
 * The filter half of a {@link ColumnDefinition}, discriminated on `filterType` so
 * `filterOptions` is required exactly where it applies and `filterFn` receives the
 * value shape that filter type actually produces.
 *
 * Every branch declares every filter key (inapplicable ones as `never`) so a column
 * can be read and written generically — e.g. mn-table resolving `filterPlaceholderKey`
 * across all columns — without narrowing first.
 */
type ColumnFilterConfig<T> =
  | (ColumnFilterCommon & {
  filterType?: 'text';
  filterOptions?: never;
  /** Custom predicate. Receives the row and the trimmed text the user typed. */
  filterFn?: (row: T, filterValue: string) => boolean;
})
  | (ColumnFilterCommon & {
  filterType: 'select';
  filterOptions: ColumnFilterOption[];
  /** Custom predicate. Receives the row and the selected option value. */
  filterFn?: (row: T, filterValue: string) => boolean;
})
  | (ColumnFilterCommon & {
  filterType: 'multi-select';
  filterOptions: ColumnFilterOption[];
  /** Custom predicate. Receives the row and every selected option value. */
  filterFn?: (row: T, filterValue: string[]) => boolean;
})
  | (ColumnFilterCommon & {
  filterType: 'boolean';
  filterOptions?: never;
  /** Custom predicate. Receives the row and the chosen true/false state. */
  filterFn?: (row: T, filterValue: boolean) => boolean;
})
  | (ColumnFilterCommon & {
  filterType: 'number-range';
  filterOptions?: never;
  /** Custom predicate. Receives the row and the inclusive numeric bounds. */
  filterFn?: (row: T, filterValue: NumberRangeFilterValue) => boolean;
})
  | (ColumnFilterCommon & {
  filterType: 'date-range';
  filterOptions?: never;
  /** Custom predicate. Receives the row and the inclusive `YYYY-MM-DD` bounds. */
  filterFn?: (row: T, filterValue: DateRangeFilterValue) => boolean;
})
  | {
  filterable?: false;
  filterType?: never;
  filterOptions?: never;
  filterFn?: never;
  filterPlaceholder?: string;
  filterPlaceholderKey?: string;
  filterDisabled?: never;
  filterAutocomplete?: never;
};

export type ColumnDefinition<T> = ColumnBase<T> & ColumnFilterConfig<T>;

// ── Table Data Source ──
export type TableDataSource<T> = MnSelectableCollectionDataSource<T> & {
  columns: ColumnDefinition<T>[];

  // Sorting
  defaultSort?: SortState;

  // Row interaction
  onRowClick?: (row: T) => void;

  // Appearance
  appearance?: TableAppearance;

  // Toolbar
  /** Template rendered on the left side of the toolbar (before the search field). */
  toolbarLeftTemplate?: TemplateRef<unknown>;
  /** Template rendered on the right side of the toolbar (after the search field). */
  toolbarRightTemplate?: TemplateRef<unknown>;

  // Responsive filters
  /**
   * Label for the toggle button that opens the stacked filter panel on small
   * screens (below 640px). Defaults to "Filters".
   */
  filtersLabel?: string;
  /** Translation key for {@link filtersLabel}. Resolved via MnLanguageService. */
  filtersLabelKey?: string;
  /**
   * Label for the action that resets every column filter in the small-screen
   * panel. Defaults to "Clear all".
   */
  clearFiltersLabel?: string;
  /** Translation key for {@link clearFiltersLabel}. Resolved via MnLanguageService. */
  clearFiltersLabelKey?: string;
  /** Labels for the range / boolean filter controls. */
  filterLabels?: MnTableFilterLabels;

  // Server-side filtering
  /**
   * Callback invoked when a column filter changes (server-side filtering).
   * When provided, mn-table skips client-side column filtering entirely and
   * delegates to the consumer, exactly as {@link MnCollectionDataSource.onServerSearch}
   * does for search: the table resets to page 1 and hands over every active filter.
   *
   * Required whenever filterable columns are combined with
   * `paginationMode: 'paginated'` — client-side filtering would otherwise only
   * filter the page the server already returned, while the paginator kept
   * reporting the unfiltered `totalItems`.
   *
   * Text filters are debounced (300ms); every other filter type fires immediately.
   */
  onColumnFilterChange?: (filters: MnColumnFilter[]) => void;
}

// ── Filter control labels ──
/**
 * User-facing labels for the filter controls that need more than a placeholder.
 * Each has a `*Key` counterpart resolved via MnLanguageService on init and on
 * every locale change.
 */
export type MnTableFilterLabels = {
  /** Lower bound of a number range. Defaults to "Min". */
  min?: string;
  minKey?: string;
  /** Upper bound of a number range. Defaults to "Max". */
  max?: string;
  maxKey?: string;
  /** Start of a date range. Defaults to "From". */
  from?: string;
  fromKey?: string;
  /** End of a date range. Defaults to "To". */
  to?: string;
  toKey?: string;
  /** Unset option of a boolean filter. Defaults to "Any". */
  any?: string;
  anyKey?: string;
  /** True option of a boolean filter. Defaults to "Yes". */
  yes?: string;
  yesKey?: string;
  /** False option of a boolean filter. Defaults to "No". */
  no?: string;
  noKey?: string;
  /**
   * Summary a multi-select filter collapses to from the second selection onwards.
   * The `{count}` token is replaced with how many are selected. Defaults to
   * `{count} selected`. A column header has room for about one value, so listing
   * them all would overflow the cell the moment a second one is picked.
   */
  selected?: string;
  /** Translation key for {@link selected}. */
  selectedKey?: string;
}

/** @deprecated Use {@link MnCollectionLabels}. */
export type TableLabels = MnCollectionLabels;
