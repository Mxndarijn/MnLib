import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, EventEmitter, inject, Input, OnDestroy, OnInit, Output, TemplateRef} from '@angular/core';
import {NgClass, NgTemplateOutlet} from '@angular/common';
import {Subject, Subscription, debounceTime, skip} from 'rxjs';
import {ListDataSource} from './mn-list.types';
import {MnButton} from '../mn-button/mn-button';

@Component({
  selector: 'mn-list',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, MnButton],
  templateUrl: './mn-list.component.html',
  styleUrl: './mn-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnList<T = any> implements OnInit, OnDestroy, DoCheck {
  @Input() dataSource!: ListDataSource<T>;

  @Output() selectionChange = new EventEmitter<T[]>();
  @Output() itemClick = new EventEmitter<T>();

  filteredItems: T[] = [];
  paginatedItems: T[] = [];
  searchValue = '';
  loadingMoreRows = false;
  selectedIds = new Set<string>();

  currentPage = 1;
  pageSize = 10;

  private cdr = inject(ChangeDetectorRef);
  private dataSubscription?: Subscription;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  /** Tracks the previous toolbar template reference for change detection. */
  private previousToolbarTemplate?: TemplateRef<any>;

  ngDoCheck(): void {
    const currentTemplate = this.dataSource?.toolbarTemplate;
    if (currentTemplate !== this.previousToolbarTemplate) {
      this.previousToolbarTemplate = currentTemplate;
      this.cdr.markForCheck();
    }
  }

  ngOnInit(): void {
    this.pageSize = this.dataSource.pageSize ?? 10;

    // Pre-select items from initialSelectedIds if provided
    if (this.dataSource.initialSelectedIds?.length) {
      for (const id of this.dataSource.initialSelectedIds) {
        this.selectedIds.add(id);
      }
      this.emitSelection();
    }

    this.applyFilter(false);

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

  // ── Selection ──

  isSelected(item: T): boolean {
    return this.selectedIds.has(this.dataSource.getID(item));
  }

  toggleItem(item: T): void {
    const id = this.dataSource.getID(item);
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
      this.filteredItems.forEach(item => this.selectedIds.add(this.dataSource.getID(item)));
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

  // ── Item interaction ──

  onItemClick(item: T): void {
    this.dataSource.onItemClick?.(item);
    this.itemClick.emit(item);
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

  trackByID = (_index: number, item: T): string => {
    return this.dataSource.getID(item);
  };

  // ── Skeleton rows for loading ──

  get skeletonRows(): number[] {
    return Array.from({length: 5});
  }

  // ── Private ──

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

  private applyFilter(searchForItems: boolean): void {
    let items = this.dataSource.dataRows.value;

    // Global search filter
    if (this.dataSource.isInSearch && this.dataSource.canSearch && this.searchValue.length > 0) {
      const term = this.searchValue.toLowerCase();
      items = items.filter(row => this.dataSource.isInSearch!(row, term));
    }

    this.filteredItems = items;
    this.applyPagination();

    if (searchForItems) {
      this.loadMoreRows();
    }
  }

  private processLoadedRows(rows: T[]): void {
    const merged = [...new Map(
      [...this.dataSource.dataRows.value, ...rows].map(item => [this.dataSource.getID(item), item])
    ).values()];
    this.dataSource.dataRows.next(merged);
    this.loadingMoreRows = false;
    this.applyFilter(false);
  }

  private emitSelection(): void {
    const rows = this.dataSource.dataRows.value.filter(r => this.selectedIds.has(this.dataSource.getID(r)));
    this.dataSource.selectedRows?.next(rows);
    this.selectionChange.emit(rows);
  }
}
