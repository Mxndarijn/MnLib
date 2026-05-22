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
  cell: ((row: T) => string) | TemplateRef<any>;
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
  emptyTemplate?: TemplateRef<any>;
  isDataLoading: boolean;

  // Search
  canSearch: boolean;
  searchPlaceholder?: string;
  isInSearch?: (row: T, searchValue: string) => boolean;
  searchForAdditionalItems?: (searchValue: string) => Promise<T[]>;

  // Pagination
  paginationMode?: 'none' | 'load-more' | 'paginated' | 'infinite-scroll';
  paginationStrategy?: PaginationStrategy;
  loadAdditionalRows?: () => Promise<T[]>;

  /** Number of rows per page when paginationMode is 'paginated'. Defaults to 10. */
  pageSize?: number;

  /** Options for the page-size selector dropdown. Defaults to [5, 10, 25, 50]. */
  pageSizeOptions?: number[];

  // Sorting
  defaultSort?: SortState;

  // Selection
  selectionMode?: 'none' | 'single' | 'multi';
  selectedRows?: BehaviorSubject<T[]>;

  // Row interaction
  onRowClick?: (row: T) => void;

  // Appearance
  appearance?: TableAppearance;

  // Toolbar
  toolbarTemplate?: TemplateRef<any>;
}
