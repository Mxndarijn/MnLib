import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, EventEmitter, inject, Input, OnDestroy, OnInit, Output, TemplateRef} from '@angular/core';
import {NgClass, NgTemplateOutlet} from '@angular/common';
import {Subject, Subscription, debounceTime, skip} from 'rxjs';
import {ColumnDefinition, ColumnSortType, SortState, TableDataSource} from './mn-table.types';
import {MnButton} from '../mn-button/mn-button';
import {MnHiddenBelowDirective} from './mn-hidden-below.directive';

/** Map of column key to its current filter value. */
export type ColumnFilterState = Record<string, string>;

@Component({
  selector: 'mn-table',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, MnButton, MnHiddenBelowDirective],
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
  private dataSubscription?: Subscription;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

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

  ngOnInit(): void {
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
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
  }

  // ── Search ──

  onSearch(searchString: string): void {
    this.currentPage = 1;
    this.searchSubject.next(searchString);
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

  loadMoreRows(): void {
    if (!this.dataSource.loadAdditionalRows || this.loadingMoreRows) return;

    this.loadingMoreRows = true;
    const promise = (this.searchValue.length > 0 && this.dataSource.searchForAdditionalItems)
      ? this.dataSource.searchForAdditionalItems(this.searchValue)
      : this.dataSource.loadAdditionalRows();

    promise
      .then(rows => this.processLoadedRows(rows))
      .catch(() => this.loadingMoreRows = false);
  }

  get showLoadMore(): boolean {
    const mode = this.dataSource.paginationMode ?? 'load-more';
    const strategy = this.dataSource.paginationStrategy;
    const hasMore = strategy ? strategy.hasMoreRows : !!this.dataSource.loadAdditionalRows;
    return mode === 'load-more' && hasMore;
  }

  // ── Paginated Mode ──

  get isPaginated(): boolean {
    return this.dataSource.paginationMode === 'paginated';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
  }

  get resolvedPageSizeOptions(): number[] {
    return this.dataSource.pageSizeOptions ?? [5, 10, 25, 50];
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyPagination();
    this.cdr.markForCheck();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
    this.applyPagination();
    this.cdr.markForCheck();
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  private applyPagination(): void {
    if (this.isPaginated) {
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
      const start = (this.currentPage - 1) * this.pageSize;
      this.paginatedItems = this.filteredItems.slice(start, start + this.pageSize);
    } else {
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

    // Global search filter
    if (this.dataSource.isInSearch && this.dataSource.canSearch && this.searchValue.length > 0) {
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

  private emitSelection(): void {
    const rows = this.dataSource.dataRows.value.filter(r => this.selectedIds.has(this.dataSource.getID(r)));
    this.dataSource.selectedRows?.next(rows);
    this.selectionChange.emit(rows);
  }
}
