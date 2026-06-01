import {TemplateRef} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {PaginationStrategy} from '../mn-table';

// ── List Appearance ──
export interface ListAppearance {
  /** Show a divider between items. Defaults to true. */
  dividers?: boolean;
  /** Highlight item on hover. Defaults to true. */
  hover?: boolean;
  /** Use compact (smaller) padding. */
  compact?: boolean;
  /** Show a border around the list. */
  bordered?: boolean;
}

// ── List Data Source ──
export interface ListDataSource<T> {
  dataRows: BehaviorSubject<T[]>;
  getID: (row: T) => string;

  /** Template used to render each list item. Receives the item as `$implicit` and `data`. */
  itemTemplate: TemplateRef<any>;

  emptyMessage: string;
  emptyTemplate?: TemplateRef<any>;
  isDataLoading: boolean;

  // Search
  canSearch: boolean;
  searchPlaceholder?: string;
  isInSearch?: (row: T, searchValue: string) => boolean;
  searchForAdditionalItems?: (searchValue: string) => Promise<T[]>;

  // Pagination
  paginationMode?: 'none' | 'load-more' | 'paginated' | 'client-side-pagination' | 'infinite-scroll';
  paginationStrategy?: PaginationStrategy;
  loadAdditionalRows?: () => Promise<T[]>;

  /** Number of items per page when paginationMode is 'paginated'. Defaults to 10. */
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
   * When provided, the list delegates pagination to the consumer (server-side).
   */
  onPageChange?: (page: number) => void;

  /**
   * Callback invoked when the user types in the search box (server-side search).
   * When provided, the list skips client-side filtering and delegates to the consumer.
   */
  onServerSearch?: (searchValue: string) => void;

  /**
   * Callback invoked when the user scrolls to the bottom in infinite-scroll mode.
   * When provided, the list delegates loading more rows to the consumer (server-side).
   */
  onLoadMore?: () => void;

  // Selection
  selectionMode?: 'none' | 'single' | 'multi';
  selectedRows?: BehaviorSubject<T[]>;
  /** IDs to pre-select when the list initializes. */
  initialSelectedIds?: string[];

  // Item interaction
  onItemClick?: (item: T) => void;

  // Appearance
  appearance?: ListAppearance;

  // Toolbar
  toolbarTemplate?: TemplateRef<any>;

  // Labels / i18n
  labels?: ListLabels;
}

export interface ListLabels {
  loadMore?: string;
  rowsPerPage?: string;
}
