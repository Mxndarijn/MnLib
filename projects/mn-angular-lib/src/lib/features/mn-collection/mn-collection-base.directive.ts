import {
  ChangeDetectorRef,
  Directive,
  DoCheck,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  TemplateRef,
} from '@angular/core';
import {debounceTime, skip, Subject, Subscription} from 'rxjs';
import {MnLanguageService} from '../../language';
import {MnSelectOption} from '../mn-select';
import {MnCollectionDataSource} from './mn-collection.types';

/**
 * Shared chrome for MnLib collection components (table, list, grid):
 * data subscription, client/server search, every pagination mode, load-more,
 * skeleton-row count, empty-state plumbing, common i18n key resolution and
 * toolbar change-detection.
 *
 * Concrete components extend this (or {@link MnSelectableCollectionBase}) and
 * implement only their rendering. The class is decorated `@Directive()` so it can
 * declare `@Input`s and use `inject()` while remaining abstract.
 *
 * Init runs in a fixed order (see {@link ngOnInit}); subclasses hook in via the
 * `protected` template methods rather than overriding `ngOnInit`.
 */
@Directive()
export abstract class MnCollectionBase<T, DS extends MnCollectionDataSource<T>>
  implements OnInit, OnDestroy, DoCheck {
  @Input() dataSource!: DS;

  filteredItems: T[] = [];
  paginatedItems: T[] = [];
  searchValue = '';
  loadingMoreRows = false;

  currentPage = 1;
  pageSize = 10;

  /**
   * Measured pixel height of the body container, applied as a `min-height` floor
   * while a server reload is in flight so the container can't collapse when the
   * data rows are swapped for skeletons. Released in {@link ngDoCheck} the moment
   * `isDataLoading` clears. `0` means no lock.
   */
  lockedMinHeight = 0;

  protected readonly cdr = inject(ChangeDetectorRef);
  protected readonly lang = inject(MnLanguageService);
  /** Prefix used in validation error messages, e.g. `MnList`. Overridden by subclasses. */
  protected readonly componentName: string = 'MnCollection';
  private dataSubscription?: Subscription;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private langSubscription?: Subscription;
  /** Tracks the previous toolbar template reference for change detection. */
  private previousToolbarTemplate?: TemplateRef<unknown>;

  // ── Template-method hooks ──

  /** Whether the component delegates search to the consumer (server-side). */
  get isServerSearched(): boolean {
    return !!this.dataSource.onServerSearch;
  }

  get isPaginated(): boolean {
    const mode = this.dataSource.paginationMode;
    return mode === 'paginated' || mode === 'client-side-pagination';
  }

  /** Whether the component delegates pagination to the consumer (server-side). */
  get isServerPaginated(): boolean {
    const mode = this.dataSource.paginationMode ?? 'load-more';
    return mode === 'paginated' || mode === 'load-more';
  }

  get showLoadMore(): boolean {
    const mode = this.dataSource.paginationMode ?? 'load-more';
    // Server-side load-more: check if there are more items to load.
    if (this.dataSource.onLoadMore) {
      const totalItems = this.dataSource.totalItems ?? 0;
      return mode === 'load-more' && this.filteredItems.length < totalItems;
    }
    const strategy = this.dataSource.paginationStrategy;
    const hasMore = strategy ? strategy.hasMoreRows : !!this.dataSource.loadAdditionalRows;
    return mode === 'load-more' && hasMore;
  }

  // ── Lifecycle ──

  /** Total number of items, accounting for server-side pagination. */
  get totalItemCount(): number {
    if (this.isServerPaginated && this.dataSource.totalItems != null) {
      return this.dataSource.totalItems;
    }
    return this.filteredItems.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItemCount / this.pageSize));
  }

  get resolvedPageSizeOptions(): number[] {
    return this.dataSource.pageSizeOptions ?? [5, 10, 25, 50];
  }

  // ── Search ──

  /** Page-size options formatted for mn-select. */
  get pageSizeSelectOptions(): MnSelectOption<number>[] {
    return this.resolvedPageSizeOptions.map(opt => ({label: String(opt), value: opt}));
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const maxVisible = 3;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > total) {
      end = total;
      start = Math.max(1, end - maxVisible + 1);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // ── Pagination ──
  /**
   * Body container wrapping the skeleton/data swap region, used to measure its
   * height for {@link lockBodyHeight}. Implemented by each component with a
   * `@ViewChild('collectionBody')` so the template reference resolves there.
   */
  protected abstract collectionBody?: ElementRef<HTMLElement>;

  /** The toolbar template whose identity is watched in change detection. */
  protected abstract get trackedToolbarTemplate(): TemplateRef<unknown> | undefined;

  get skeletonRows(): number[] {
    // Explicit override wins; otherwise match the rows currently on screen so the
    // skeleton fills the same space on a reload; fall back to 5 on the first load.
    const count = this.dataSource.skeletonRowCount ?? (this.paginatedItems.length || 5);
    return Array.from({length: count});
  }

  ngOnInit(): void {
    this.validateDataSource();
    this.resolveTranslationKeys();
    this.pageSize = this.dataSource.pageSize ?? 10;
    this.beforeInitialFilter();

    this.applyFilter(false);

    // Skip the initial BehaviorSubject emission (already handled above).
    this.dataSubscription = this.dataSource.dataRows.pipe(skip(1)).subscribe(() => {
      this.applyFilter(false);
      this.cdr.markForCheck();
    });

    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(value => {
        this.searchValue = value;
        this.applyFilter(true);
        this.cdr.markForCheck();
      });

    // Re-resolve translation keys whenever the locale changes.
    this.langSubscription = this.lang.locale$.pipe(skip(1)).subscribe(() => {
      this.resolveTranslationKeys();
      this.cdr.markForCheck();
    });
  }

  ngDoCheck(): void {
    // Release the height lock as soon as loading ends — same CD cycle that clears
    // the skeleton, so the lock can never outlive the skeleton it protects.
    if (this.lockedMinHeight && !this.dataSource.isDataLoading) {
      this.lockedMinHeight = 0;
    }
    const currentTemplate = this.trackedToolbarTemplate;
    if (currentTemplate !== this.previousToolbarTemplate) {
      this.previousToolbarTemplate = currentTemplate;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
    this.langSubscription?.unsubscribe();
  }

  onSearch(searchString: string): void {
    this.currentPage = 1;
    if (this.isServerSearched) {
      this.lockBodyHeight();
      this.searchValue = searchString;
      this.dataSource.onServerSearch?.(searchString);
      this.cdr.markForCheck();
    } else {
      this.searchSubject.next(searchString);
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    if (this.dataSource.paginationMode === 'client-side-pagination') {
      this.applyPagination();
    } else {
      this.lockBodyHeight();
      this.dataSource.onPageChange?.(page);
    }
    this.cdr.markForCheck();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
    if (this.dataSource.paginationMode === 'client-side-pagination') {
      this.applyPagination();
    } else {
      this.lockBodyHeight();
      this.dataSource.onPageSizeChange?.(newSize);
    }
    this.cdr.markForCheck();
  }

  loadMoreRows(): void {
    // Server-side infinite scroll: delegate to consumer callback.
    if (this.dataSource.onLoadMore) {
      this.dataSource.onLoadMore();
      return;
    }

    if (!this.dataSource.loadAdditionalRows || this.loadingMoreRows) return;

    this.loadingMoreRows = true;
    const promise = (this.searchValue && this.searchValue.length > 0 && this.dataSource.searchForAdditionalItems)
      ? this.dataSource.searchForAdditionalItems(this.searchValue)
      : this.dataSource.loadAdditionalRows();

    promise
      .then(rows => this.processLoadedRows(rows))
      .catch(() => this.loadingMoreRows = false);
  }

  isTemplateRef(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef;
  }

  trackByID = (_index: number, item: T): string => {
    return this.dataSource.getID(item);
  };

  // ── Skeleton ──

  /** Applies search/sort/filtering and pagination to the current rows. */
  protected abstract applyFilter(searchForItems: boolean): void;

  // ── Template helpers ──

  /** Runs after pageSize is set but before the first {@link applyFilter}. */
  protected beforeInitialFilter(): void {
    // no-op by default
  }

  /**
   * Resolves translation keys to display strings via {@link MnLanguageService}.
   * Subclasses override to resolve their own keys; call `super` to keep these.
   */
  protected resolveTranslationKeys(): void {
    if (this.dataSource.emptyMessageKey) {
      this.dataSource.emptyMessage = this.lang.t(this.dataSource.emptyMessageKey);
    }
    if (this.dataSource.searchPlaceholderKey) {
      this.dataSource.searchPlaceholder = this.lang.t(this.dataSource.searchPlaceholderKey);
    }
    if (this.dataSource.labels) {
      if (this.dataSource.labels.loadMoreKey) {
        this.dataSource.labels.loadMore = this.lang.t(this.dataSource.labels.loadMoreKey);
      }
      if (this.dataSource.labels.rowsPerPageKey) {
        this.dataSource.labels.rowsPerPage = this.lang.t(this.dataSource.labels.rowsPerPageKey);
      }
    }
  }

  // ── Shared internals ──

  /**
   * Captures the body container's current height into {@link lockedMinHeight} so it
   * holds while a server reload swaps the data rows for skeletons. Must be called
   * while the old rows are still rendered (before delegating to the consumer), and
   * only locks when rows are present — the first load has nothing to preserve.
   */
  protected lockBodyHeight(): void {
    const el = this.collectionBody?.nativeElement;
    if (el && this.paginatedItems.length > 0) {
      this.lockedMinHeight = el.offsetHeight;
    }
  }

  protected applyPagination(): void {
    if (this.dataSource.paginationMode === 'client-side-pagination') {
      const start = (this.currentPage - 1) * this.pageSize;
      this.paginatedItems = this.filteredItems.slice(start, start + this.pageSize);
    } else {
      // Server always provides the correct page/slice — no client-side slicing.
      this.paginatedItems = this.filteredItems;
    }
  }

  /** Client-side search filtering shared by list and grid. */
  protected applySearchFilter(items: T[]): T[] {
    if (!this.isServerSearched && this.dataSource.isInSearch && this.dataSource.canSearch && this.searchValue && this.searchValue.length > 0) {
      const term = this.searchValue.toLowerCase();
      return items.filter(row => this.dataSource.isInSearch!(row, term));
    }
    return items;
  }

  protected processLoadedRows(rows: T[]): void {
    const merged = [...new Map(
      [...this.dataSource.dataRows.value, ...rows].map(item => [this.dataSource.getID(item), item])
    ).values()];
    this.dataSource.dataRows.next(merged);
    this.loadingMoreRows = false;
    this.applyFilter(false);
  }

  protected validateDataSource(): void {
    const mode = this.dataSource.paginationMode;
    if (mode === 'paginated') {
      if (!this.dataSource.onPageChange) {
        throw new Error(`[${this.componentName}] paginationMode is 'paginated' but 'onPageChange' callback is missing. Server-side pagination requires 'onPageChange'.`);
      }
      if (this.dataSource.totalItems == null) {
        throw new Error(`[${this.componentName}] paginationMode is 'paginated' but 'totalItems' is missing. Server-side pagination requires 'totalItems'.`);
      }
    }
    if (mode === 'load-more' || mode === 'infinite-scroll') {
      if (!this.dataSource.onLoadMore && !this.dataSource.loadAdditionalRows && !this.dataSource.paginationStrategy) {
        throw new Error(`[${this.componentName}] paginationMode is '${mode}' but no load-more mechanism is provided. Provide 'onLoadMore', 'loadAdditionalRows', or 'paginationStrategy'.`);
      }
    }
    // Validate pageSize is one of pageSizeOptions when pagination is active
    if (mode && mode !== 'none') {
      const options = this.dataSource.pageSizeOptions ?? [5, 10, 25, 50];
      const size = this.dataSource.pageSize ?? 10;
      if (!options.includes(size)) {
        throw new Error(`[${this.componentName}] pageSize '${size}' is not one of the allowed pageSizeOptions [${options.join(', ')}]. pageSize must be one of pageSizeOptions.`);
      }
    }
  }
}
