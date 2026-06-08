import {TemplateRef} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

// ── Pagination Strategy ──
export interface PaginationStrategy {
  hasMoreRows: boolean;
  loadMore: () => Promise<void>;
  reset?: () => void;
}

export interface CursorPaginationStrategy extends PaginationStrategy {
  endCursor?: string;
}

export interface OffsetPaginationStrategy extends PaginationStrategy {
  currentPage: number;
  pageSize: number;
  totalItems?: number;
}

// ── Column Sort Type ──
export enum ColumnSortType {
  ALPHABETICAL = 'ALPHABETICAL',
  NUMERICAL = 'NUMERICAL',
  DATE = 'DATE',
  NONE = 'NONE',
}

// ── Sort State ──
export interface SortState {
  columnKey: string;
  direction: 'asc' | 'desc';
}

// ── Appearance ──
export interface TableAppearance {
  striped?: boolean;
  hover?: boolean;
  compact?: boolean;
  bordered?: boolean;
}

// ── Column Filter Type ──
export type ColumnFilterType = 'text' | 'select';

// ── Column Filter Option ──
export interface ColumnFilterOption {
  label: string;
  value: string;
}

// ── Column Definition ──
export interface ColumnDefinition<T> {
  key: string;
  header: string | TemplateRef<any>;
  /** Translation key for the column header. When set, mn-table resolves it via MnLanguageService and keeps it updated on locale change. */
  headerKey?: string;
  cell: ((row: T) => string) | TemplateRef<any>;
  /** Alternative cell renderer shown below the given breakpoint. When set, `cell` is hidden below this breakpoint and `cellSm` is shown instead. */
  cellSm?: { below: 'sm' | 'md' | 'lg'; cell: ((row: T) => string) | TemplateRef<any> };
  sortType?: ColumnSortType;
  getRawValueToSort?: (row: T) => any;
  width?: string;
  align?: 'left' | 'center' | 'right';
  hiddenBelow?: 'sm' | 'md' | 'lg';
  /** Whether this column supports per-column filtering. */
  filterable?: boolean;
  /** Type of filter input: 'text' for free-text, 'select' for dropdown. Defaults to 'text'. */
  filterType?: ColumnFilterType;
  /** Options for 'select' filter type. */
  filterOptions?: ColumnFilterOption[];
  /** Placeholder text for the filter input. */
  filterPlaceholder?: string;
  /** Translation key for the filter placeholder. When set, mn-table resolves it via MnLanguageService. */
  filterPlaceholderKey?: string;
  /** Whether the filter input is disabled. */
  filterDisabled?: boolean;
  /** Autocomplete attribute for the filter input. */
  filterAutocomplete?: string;
  /** Maximum character length for text filter inputs. */
  filterMaxLength?: number;
  /** Custom filter function. Receives the row and the current filter value. */
  filterFn?: (row: T, filterValue: string) => boolean;
}

// ── Table Data Source ──
export interface TableDataSource<T> {
  dataRows: BehaviorSubject<T[]>;
  columns: ColumnDefinition<T>[];
  getID: (row: T) => string;
  emptyMessage: string;
  /** Translation key for the empty message. When set, mn-table resolves it via MnLanguageService. */
  emptyMessageKey?: string;
  emptyTemplate?: TemplateRef<any>;
  isDataLoading: boolean;

  // Search
  canSearch: boolean;
  searchPlaceholder?: string;
  /** Translation key for the search placeholder. When set, mn-table resolves it via MnLanguageService. */
  searchPlaceholderKey?: string;
  isInSearch?: (row: T, searchValue: string) => boolean;
  searchForAdditionalItems?: (searchValue: string) => Promise<T[]>;

  // Pagination
  paginationMode?: 'none' | 'load-more' | 'paginated' | 'client-side-pagination' | 'infinite-scroll';
  paginationStrategy?: PaginationStrategy;
  loadAdditionalRows?: () => Promise<T[]>;

  /** Number of rows per page when paginationMode is 'paginated'. Defaults to 10. */
  pageSize?: number;

  /** Options for the page-size selector dropdown. Defaults to [5, 10, 25, 50]. */
  pageSizeOptions?: number[];

  /** Callback invoked when the user changes the page size via the dropdown. */
  onPageSizeChange?: (newSize: number) => void;

  /**
   * Total number of items on the server.
   * When set, pagination and infinite-scroll use this instead of filteredItems.length.
   */
  totalItems?: number;

  /**
   * Callback invoked when the user navigates to a different page.
   * When provided, the table delegates pagination to the consumer (server-side).
   * The consumer is responsible for fetching the new page data and updating dataRows.
   */
  onPageChange?: (page: number) => void;

  /**
   * Callback invoked when the user types in the search box (server-side search).
   * When provided, the table skips client-side filtering and delegates to the consumer.
   */
  onServerSearch?: (searchValue: string) => void;

  /**
   * Callback invoked when the user scrolls to the bottom in infinite-scroll mode.
   * When provided, the table delegates loading more rows to the consumer (server-side).
   * The consumer is responsible for appending new data to dataRows.
   */
  onLoadMore?: () => void;

  // Sorting
  defaultSort?: SortState;

  // Selection
  selectionMode?: 'none' | 'single' | 'multi';
  selectedRows?: BehaviorSubject<T[]>;
  /** IDs to pre-select when the table initializes. */
  initialSelectedIds?: string[];

  // Row interaction
  onRowClick?: (row: T) => void;

  // Appearance
  appearance?: TableAppearance;

  // Toolbar
  /** Template rendered on the left side of the toolbar (before the search field). */
  toolbarLeftTemplate?: TemplateRef<any>;
  /** Template rendered on the right side of the toolbar (after the search field). */
  toolbarRightTemplate?: TemplateRef<any>;

  // Labels / i18n
  labels?: TableLabels;
}

export interface TableLabels {
  loadMore?: string;
  /** Translation key for the "Load more" button label. */
  loadMoreKey?: string;
  rowsPerPage?: string;
  /** Translation key for the "Rows per page" label. */
  rowsPerPageKey?: string;
}
