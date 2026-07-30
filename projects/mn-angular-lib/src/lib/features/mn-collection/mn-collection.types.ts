import {TemplateRef} from '@angular/core';
import {LucideIconData} from '@lucide/angular';
import {BehaviorSubject} from 'rxjs';

// ── Pagination Strategy ──
export type PaginationStrategy = {
  hasMoreRows: boolean;
  loadMore: () => Promise<void>;
  reset?: () => void;
}

export type CursorPaginationStrategy = {
  endCursor?: string;
} & PaginationStrategy

export type OffsetPaginationStrategy = {
  currentPage: number;
  pageSize: number;
  totalItems?: number;
} & PaginationStrategy

// ── Data lifecycle state ──
/**
 * Lifecycle state of a collection's data, driving which chrome the component
 * renders: skeleton placeholders ({@link LOADING}), the rows or empty state
 * ({@link RETRIEVED}), or an error placeholder ({@link ERROR}).
 *
 * Because the components are zoneless and OnPush, a consumer that flips `state`
 * to `ERROR` (or `RETRIEVED`) must also emit on `dataRows` (e.g. `dataRows.next([])`)
 * so the component runs change detection and re-reads the new state.
 */
export enum MnCollectionState {
  /** Data is being (re)loaded; skeleton placeholders are shown. */
  LOADING = 'LOADING',
  /** Data has loaded (possibly empty); rows or the empty state are shown. */
  RETRIEVED = 'RETRIEVED',
  /** Loading failed; the error placeholder is shown. */
  ERROR = 'ERROR',
}

// ── Pagination Mode ──
export type PaginationMode =
  | 'none'
  | 'load-more'
  | 'paginated'
  | 'client-side-pagination'
  | 'infinite-scroll';

// ── Shared Labels / i18n ──
export type MnCollectionLabels = {
  loadMore?: string;
  /** Translation key for the "Load more" button label. */
  loadMoreKey?: string;
  rowsPerPage?: string;
  /** Translation key for the "Rows per page" label. */
  rowsPerPageKey?: string;
  /**
   * Page position readout, shown on narrow viewports where the item range does
   * not fit. Supports the `{{current}}` and `{{total}}` placeholders.
   * Defaults to `Page {{current}} of {{total}}`.
   */
  pageIndicator?: string;
  /** Translation key for the page position readout. */
  pageIndicatorKey?: string;
  /**
   * Item range readout. Supports the `{{start}}`, `{{end}}` and `{{total}}`
   * placeholders. Defaults to `{{start}}–{{end}} of {{total}}`.
   */
  itemRange?: string;
  /** Translation key for the item range readout. */
  itemRangeKey?: string;
}

/**
 * Chrome shared by every MnLib collection component (table, list, grid):
 * data, search, pagination, loading/skeleton, empty state and i18n. Component
 * data sources ({@link import('../mn-table').TableDataSource},
 * {@link import('../mn-list').ListDataSource},
 * {@link import('../mn-grid').GridDataSource}) extend this with their own
 * rendering contract (columns / item template / card template).
 */
export type MnCollectionDataSource<T> = {
  dataRows: BehaviorSubject<T[]>;
  getID: (row: T) => string;

  emptyMessage: string;
  /** Translation key for the empty message. When set, the component resolves it via MnLanguageService. */
  emptyMessageKey?: string;
  emptyTemplate?: TemplateRef<unknown>;
  /**
   * Icon rendered above {@link emptyMessage} in the default empty state. Pass any
   * lucide icon's static `.icon` data (e.g. `LucideSearchX.icon`). Defaults to an
   * inbox icon when omitted; set to `null` to render the message with no icon.
   * Ignored when {@link emptyTemplate} is provided.
   */
  emptyIcon?: LucideIconData | null;

  /**
   * Lifecycle state of the data, controlling loading / error / empty rendering.
   * Defaults to {@link MnCollectionState.RETRIEVED} when not set.
   */
  state?: MnCollectionState;
  /** Number of placeholder rows rendered while data is loading. Defaults to 5. */
  skeletonRowCount?: number;

  /** Message shown in the error placeholder when {@link state} is ERROR. */
  errorMessage?: string;
  /** Translation key for {@link errorMessage}; resolved via MnLanguageService. */
  errorMessageKey?: string;
  /** Custom template rendered in place of the default error placeholder. */
  errorTemplate?: TemplateRef<unknown>;

  // Search
  canSearch: boolean;
  searchPlaceholder?: string;
  /** Translation key for the search placeholder. When set, the component resolves it via MnLanguageService. */
  searchPlaceholderKey?: string;
  isInSearch?: (row: T, searchValue: string) => boolean;
  searchForAdditionalItems?: (searchValue: string) => Promise<T[]>;

  /**
   * Callback invoked when the user types in the search box (server-side search).
   * When provided, the component skips client-side filtering and delegates to the consumer.
   */
  onServerSearch?: (searchValue: string) => void;

  // Pagination
  paginationMode?: PaginationMode;
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
   * When provided, the component delegates pagination to the consumer (server-side).
   */
  onPageChange?: (page: number) => void;

  /**
   * Callback invoked when the user scrolls to the bottom in infinite-scroll mode.
   * When provided, the component delegates loading more rows to the consumer (server-side).
   */
  onLoadMore?: () => void;

  // Labels / i18n
  labels?: MnCollectionLabels;
}

/**
 * Adds row/item selection to {@link MnCollectionDataSource}. Used by components
 * that support selection (table, list); grid intentionally omits it.
 */
export type MnSelectableCollectionDataSource<T> = MnCollectionDataSource<T> & {
  selectionMode?: 'none' | 'single' | 'multi';
  selectedRows?: BehaviorSubject<T[]>;
  /** IDs to pre-select when the component initializes. */
  initialSelectedIds?: string[];

  /**
   * Rows behind {@link initialSelectedIds}, for collections whose rows are paged in
   * from a server. The component can only recognise a selected row once it has been
   * loaded, so on page 1 of a server-paginated table it knows the *ids* that are
   * selected but not what they are called — which is exactly what
   * {@link selectionSummary} needs to render. Supplying the rows here fills that
   * gap. Unnecessary when every row is client-side: the ids resolve against
   * `dataRows` on their own.
   */
  initialSelectedRows?: T[];

  /**
   * Renders an always-visible summary of the current selection above the
   * collection: a count and one removable tag per selected row.
   *
   * It exists because a selection and a paginated list answer different questions.
   * The list is for *finding* rows and is therefore filtered, searched and paged;
   * the selection is the answer the user is assembling, and hiding it on page 40
   * makes people re-pick rows they already had. The summary never pages, filters or
   * sorts — it always shows the whole selection.
   */
  selectionSummary?: boolean;

  /**
   * Label for a row inside {@link selectionSummary}. Defaults to the first column
   * that renders a plain string, falling back to the row's id.
   */
  selectionLabel?: (row: T) => string;

  /**
   * How many tags {@link selectionSummary} shows before collapsing the rest behind
   * a "+N more" control. Defaults to 8.
   *
   * A summary exists to be taken in at a glance, so it must not grow without bound:
   * left uncapped, selecting a few hundred rows turns the header into the page and
   * pushes the table — the thing being worked in — off screen entirely. The count in
   * the heading always states the true total, so collapsing hides tags, never
   * information.
   */
  selectionSummaryLimit?: number;

  /** Labels for the {@link selectionSummary} chrome. */
  selectionSummaryLabels?: {
    /** Heading, supporting a `{{count}}` placeholder. Defaults to `Selected ({{count}})`. */
    title?: string;
    /** Translation key for {@link title}. */
    titleKey?: string;
    /** Label for the clear-everything action. Defaults to `Clear all`. */
    clearAll?: string;
    /** Translation key for {@link clearAll}. */
    clearAllKey?: string;
    /** Accessible label for a tag's remove button, supporting `{{label}}`. */
    remove?: string;
    /** Translation key for {@link remove}. */
    removeKey?: string;
    /** Expand action, supporting a `{{count}}` placeholder. Defaults to `+{{count}} more`. */
    showMore?: string;
    /** Translation key for {@link showMore}. */
    showMoreKey?: string;
    /** Collapse action. Defaults to `Show less`. */
    showLess?: string;
    /** Translation key for {@link showLess}. */
    showLessKey?: string;
  };
}
