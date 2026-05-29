import {TemplateRef} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {PaginationStrategy} from '../mn-table/mn-table.types';

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
  paginationMode?: 'none' | 'load-more' | 'paginated' | 'infinite-scroll';
  paginationStrategy?: PaginationStrategy;
  loadAdditionalRows?: () => Promise<T[]>;

  /** Number of items per page when paginationMode is 'paginated'. Defaults to 10. */
  pageSize?: number;

  /** Options for the page-size selector dropdown. Defaults to [5, 10, 25, 50]. */
  pageSizeOptions?: number[];

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
