import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DoCheck,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef
} from '@angular/core';
import {NgClass, NgTemplateOutlet} from '@angular/common';
import {debounceTime, skip, Subject, Subscription} from 'rxjs';
import {ColumnDefinition, ColumnSortType, SortState, TableDataSource} from './mn-table.types';
import {MnSelect, MnSelectOption} from '../mn-select';
import {MnButton} from '../mn-button';
import {MnCheckbox} from '../mn-checkbox';
import {MnHiddenBelowDirective} from './mn-hidden-below.directive';
import {MnInputField} from '../mn-input-field';
import {FormsModule} from '@angular/forms';
import {MnLanguageService} from '../../language';

/** Map of column key to its current filter value. */
export type ColumnFilterState = Record<string, string | undefined>;

@Component({
  selector: 'mn-table',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, MnButton, MnCheckbox, MnHiddenBelowDirective, MnInputField, MnSelect, FormsModule],
  templateUrl: './mn-table.component.html',
  styleUrl: './mn-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnTable<T = any> implements OnInit, OnDestroy, DoCheck {
  @Input() dataSource!: TableDataSource<T>;

  @Output() sortChange = new EventEmitter<SortState | null>();
  @Output() selectionChange = new EventEmitter<T[]>();
  @Output() rowClick = new EventEmitter<T>();

  filteredItems: T[] = [];
  paginatedItems: T[] = [];
  searchValue = '';
  loadingMoreRows = false;
  currentSort: SortState | null = null;
  selectedIds = new Set<string>();

  currentPage = 1;
  pageSize = 10;

  /** Per-column filter values keyed by column key. */
  columnFilters: ColumnFilterState = {};

  private cdr = inject(ChangeDetectorRef);
  private lang = inject(MnLanguageService);
  private dataSubscription?: Subscription;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private langSubscription?: Subscription;

  /** Tracks the previous toolbar template reference for change detection. */
  private previousToolbarTemplate?: TemplateRef<any>;

  /**
   * Checks for changes to dataSource properties that are not covered
   * by Angular's default change detection (e.g. toolbarTemplate).
   */
  ngDoCheck(): void {
    const currentTemplate = this.dataSource?.toolbarTemplate;
    if (currentTemplate !== this.previousToolbarTemplate) {
      this.previousToolbarTemplate = currentTemplate;
      this.cdr.markForCheck();
    }
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

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
    this.langSubscription?.unsubscribe();
  }

  // ── Search ──

  get isPaginated(): boolean {
    const mode = this.dataSource.paginationMode;
    return mode === 'paginated' || mode === 'client-side-pagination';
  }

  // ── Column Filters ──

  /** Whether any column has filtering enabled. */
  get hasColumnFilters(): boolean {
    return this.dataSource.columns.some(c => c.filterable);
  }

  /** Updates a column filter value and re-applies filtering. */
  onColumnFilter(columnKey: string, value: string): void {
    this.columnFilters[columnKey] = value;
    this.currentPage = 1;
    this.applyFilterAndSort(false);
    this.cdr.markForCheck();
  }

  // ── Sorting ──

  sort(column: ColumnDefinition<T>): void {
    if (!column.sortType || column.sortType === ColumnSortType.NONE) return;

    if (this.currentSort?.columnKey === column.key) {
      this.currentSort = this.currentSort.direction === 'asc'
        ? {columnKey: column.key, direction: 'desc'}
        : null;
    } else {
      this.currentSort = {columnKey: column.key, direction: 'asc'};
    }

    this.sortChange.emit(this.currentSort);
    this.applyFilterAndSort(false);
  }

  getSortIcon(column: ColumnDefinition<T>): string {
    if (!this.currentSort || this.currentSort.columnKey !== column.key) return '';
    return this.currentSort.direction === 'asc' ? '▲' : '▼';
  }

  isSortable(column: ColumnDefinition<T>): boolean {
    return !!column.sortType && column.sortType !== ColumnSortType.NONE;
  }

  // ── Selection ──

  isSelected(row: T): boolean {
    return this.selectedIds.has(this.dataSource.getID(row));
  }

  toggleRow(row: T): void {
    const id = this.dataSource.getID(row);
    const mode = this.dataSource.selectionMode ?? 'none';

    if (mode === 'single') {
      this.selectedIds.clear();
      this.selectedIds.add(id);
    } else if (mode === 'multi') {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id);
      } else {
        this.selectedIds.add(id);
      }
    }

    this.emitSelection();
  }

  toggleAll(): void {
    if (this.selectedIds.size === this.filteredItems.length) {
      this.selectedIds.clear();
    } else {
      this.filteredItems.forEach(row => this.selectedIds.add(this.dataSource.getID(row)));
    }
    this.emitSelection();
  }

  get allSelected(): boolean {
    return this.filteredItems.length > 0 && this.selectedIds.size === this.filteredItems.length;
  }

  get hasSelection(): boolean {
    return (this.dataSource.selectionMode ?? 'none') !== 'none';
  }

  get isMultiSelect(): boolean {
    return this.dataSource.selectionMode === 'multi';
  }

  // ── Row interaction ──

  onRowClick(row: T): void {
    this.dataSource.onRowClick?.(row);
    this.rowClick.emit(row);
  }

  // ── Pagination ──

  /** Whether the table delegates pagination to the consumer (server-side). */
  get isServerPaginated(): boolean {
    const mode = this.dataSource.paginationMode ?? 'load-more';
    return mode === 'paginated' || mode === 'load-more';
  }

  /** Whether the table delegates search to the consumer (server-side). */
  get isServerSearched(): boolean {
    return !!this.dataSource.onServerSearch;
  }

  // ── Paginated Mode ──

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

  ngOnInit(): void {
    this.validateDataSource();
    this.resolveTranslationKeys();
    this.currentSort = this.dataSource.defaultSort ?? null;
    this.pageSize = this.dataSource.pageSize ?? 10;

    // Initialize all filterable columns with empty string to avoid undefined values.
    for (const col of this.dataSource.columns) {
      if (col.filterable) {
        this.columnFilters[col.key] = '';
      }
    }

    // Pre-select rows from initialSelectedIds if provided
    if (this.dataSource.initialSelectedIds?.length) {
      for (const id of this.dataSource.initialSelectedIds) {
        this.selectedIds.add(id);
      }
      this.emitSelection();
    }

    this.applyFilterAndSort(false);

    // Skip the initial BehaviorSubject emission (already handled above)
    // to avoid triggering markForCheck during the first change detection cycle.
    this.dataSubscription = this.dataSource.dataRows.pipe(skip(1)).subscribe(() => {
      this.applyFilterAndSort(false);
      this.cdr.markForCheck();
    });

    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(value => {
        this.searchValue = value;
        this.applyFilterAndSort(true);
        this.cdr.markForCheck();
      });

    // Re-resolve translation keys when the locale changes.
    this.langSubscription = this.lang.locale$.pipe(skip(1)).subscribe(() => {
      this.resolveTranslationKeys();
      this.cdr.markForCheck();
    });
  }

  /**
   * Resolves all translation keys (headerKey, filterPlaceholderKey, emptyMessageKey, etc.)
   * into their corresponding display strings using MnLanguageService.
   */
  private resolveTranslationKeys(): void {
    for (const col of this.dataSource.columns) {
      if (col.headerKey) {
        col.header = this.lang.t(col.headerKey);
      }
      if (col.filterPlaceholderKey) {
        col.filterPlaceholder = this.lang.t(col.filterPlaceholderKey);
      }
    }
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

  onSearch(searchString: string): void {
    this.currentPage = 1;
    if (this.isServerSearched) {
      this.searchValue = searchString;
      this.dataSource.onServerSearch!(searchString);
      this.cdr.markForCheck();
    } else {
      this.searchSubject.next(searchString);
    }
  }

  loadMoreRows(): void {
    // Server-side infinite scroll: delegate to consumer callback.
    if (this.dataSource.onLoadMore) {
      this.dataSource.onLoadMore();
      return;
    }

    if (!this.dataSource.loadAdditionalRows || this.loadingMoreRows) return;

    this.loadingMoreRows = true;
    const promise = (this.searchValue.length > 0 && this.dataSource.searchForAdditionalItems)
      ? this.dataSource.searchForAdditionalItems(this.searchValue)
      : this.dataSource.loadAdditionalRows();

    promise
      .then(rows => this.processLoadedRows(rows))
      .catch(() => this.loadingMoreRows = false);
  }

  get resolvedPageSizeOptions(): number[] {
    return this.dataSource.pageSizeOptions ?? [5, 10, 25, 50];
  }

  /** Page-size options formatted for mn-select. */
  get pageSizeSelectOptions(): MnSelectOption<number>[] {
    return this.resolvedPageSizeOptions.map(opt => ({label: String(opt), value: opt}));
  }

  /** Filter options formatted for mn-select for a given column. */
  getFilterSelectOptions(column: ColumnDefinition<T>): MnSelectOption<string>[] {
    const placeholder = column.filterPlaceholder ?? 'All';
    return [
      {label: placeholder, value: ''},
      ...(column.filterOptions ?? []).map(opt => ({label: opt.label, value: String(opt.value)})),
    ];
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    if (this.dataSource.paginationMode === 'client-side-pagination') {
      this.applyPagination();
    } else {
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
      this.dataSource.onPageSizeChange?.(newSize);
    }
    this.cdr.markForCheck();
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

  private applyPagination(): void {
    if (this.dataSource.paginationMode === 'client-side-pagination') {
      const start = (this.currentPage - 1) * this.pageSize;
      this.paginatedItems = this.filteredItems.slice(start, start + this.pageSize);
    } else {
      // Server always provides the correct page/slice — no client-side slicing.
      this.paginatedItems = this.filteredItems;
    }
  }

  // ── Template helpers ──

  isTemplateRef(value: any): value is TemplateRef<any> {
    return value instanceof TemplateRef;
  }

  getCellValue(column: ColumnDefinition<T>, row: T): string {
    if (typeof column.cell === 'function') return column.cell(row);
    return '';
  }

  trackByID = (_index: number, row: T): string => {
    return this.dataSource.getID(row);
  };

  trackByKey = (_index: number, column: ColumnDefinition<T>): string => {
    return column.key;
  };

  // ── Table CSS classes ──

  get tableClasses(): string {
    return 'w-full border-collapse overflow-y-hidden';
  }

  get totalColumnCount(): number {
    let count = this.dataSource.columns.length;
    if (this.hasSelection) count++;
    return count;
  }

  // ── Skeleton rows for loading ──

  get skeletonRows(): number[] {
    return Array.from({length: 5});
  }

  // ── Private ──

  private applyFilterAndSort(searchForItems: boolean): void {
    let items = this.dataSource.dataRows.value;

    // Skip client-side search filtering when server handles it.
    if (!this.isServerSearched && this.dataSource.isInSearch && this.dataSource.canSearch && this.searchValue.length > 0) {
      const term = this.searchValue.toLowerCase();
      items = items.filter(row => this.dataSource.isInSearch!(row, term));
    }

    // Per-column filters
    for (const col of this.dataSource.columns) {
      const filterValue = this.columnFilters[col.key];
      if (!col.filterable || !filterValue) continue;

      if (col.filterFn) {
        items = items.filter(row => col.filterFn!(row, filterValue));
      } else {
        const term = filterValue.toLowerCase();
        items = items.filter(row => {
          const cellValue = typeof col.cell === 'function' ? col.cell(row) : '';
          return cellValue.toLowerCase().includes(term);
        });
      }
    }

    items = this.applySorting(items);
    this.filteredItems = items;
    this.applyPagination();

    if (searchForItems) {
      this.loadMoreRows();
    }
  }

  private applySorting(items: T[]): T[] {
    if (!this.currentSort) return items;

    const column = this.dataSource.columns.find(c => c.key === this.currentSort!.columnKey);
    if (!column || !column.sortType || column.sortType === ColumnSortType.NONE) return items;

    const getValue = column.getRawValueToSort ?? ((row: T) => {
      if (typeof column.cell === 'function') return column.cell(row);
      return '';
    });

    const dir = this.currentSort.direction === 'asc' ? 1 : -1;

    return [...items].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);

      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      switch (column.sortType) {
        case ColumnSortType.ALPHABETICAL:
          return String(va).localeCompare(String(vb)) * dir;
        case ColumnSortType.NUMERICAL:
          return (Number(va) - Number(vb)) * dir;
        case ColumnSortType.DATE:
          return (new Date(va).getTime() - new Date(vb).getTime()) * dir;
        default:
          return 0;
      }
    });
  }

  private processLoadedRows(rows: T[]): void {
    const merged = [...new Map(
      [...this.dataSource.dataRows.value, ...rows].map(item => [this.dataSource.getID(item), item])
    ).values()];
    this.dataSource.dataRows.next(merged);
    this.loadingMoreRows = false;
    this.applyFilterAndSort(false);
  }

  private validateDataSource(): void {
    const mode = this.dataSource.paginationMode;
    if (mode === 'paginated') {
      if (!this.dataSource.onPageChange) {
        throw new Error(`[MnTable] paginationMode is 'paginated' but 'onPageChange' callback is missing. Server-side pagination requires 'onPageChange'.`);
      }
      if (this.dataSource.totalItems == null) {
        throw new Error(`[MnTable] paginationMode is 'paginated' but 'totalItems' is missing. Server-side pagination requires 'totalItems'.`);
      }
    }
    if (mode === 'load-more' || mode === 'infinite-scroll') {
      if (!this.dataSource.onLoadMore && !this.dataSource.loadAdditionalRows && !this.dataSource.paginationStrategy) {
        throw new Error(`[MnTable] paginationMode is '${mode}' but no load-more mechanism is provided. Provide 'onLoadMore', 'loadAdditionalRows', or 'paginationStrategy'.`);
      }
    }
    // Validate pageSize is one of pageSizeOptions when pagination is active
    if (mode && mode !== 'none') {
      const options = this.dataSource.pageSizeOptions ?? [5, 10, 25, 50];
      const size = this.dataSource.pageSize ?? 10;
      if (!options.includes(size)) {
        throw new Error(`[MnTable] pageSize '${size}' is not one of the allowed pageSizeOptions [${options.join(', ')}]. pageSize must be one of pageSizeOptions.`);
      }
    }
  }

  private emitSelection(): void {
    const rows = this.dataSource.dataRows.value.filter(r => this.selectedIds.has(this.dataSource.getID(r)));
    this.dataSource.selectedRows?.next(rows);
    this.selectionChange.emit(rows);
  }
}
