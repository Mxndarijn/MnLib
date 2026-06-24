import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {NgClass, NgTemplateOutlet} from '@angular/common';
import {ColumnDefinition, ColumnSortType, SortState, TableDataSource} from './mn-table.types';
import {MnSkeleton, MnSkeletonProps} from '../mn-skeleton';
import {MnSelect, MnSelectOption} from '../mn-select';
import {MnCheckbox} from '../mn-checkbox';
import {MnHiddenBelowDirective} from './mn-hidden-below.directive';
import {MnShowAboveDirective} from './mn-show-above.directive';
import {MnShowBelowDirective} from './mn-show-below.directive';
import {MnInputField} from '../mn-input-field';
import {FormsModule} from '@angular/forms';
import {MnCollectionPagination, MnSelectableCollectionBase} from '../mn-collection';
import {MnButton} from '../mn-button';
import {LucideFilter, LucideFunnel, LucideX} from '@lucide/angular';

/** Map of column key to its current filter value. */
export type ColumnFilterState = Record<string, string | undefined>;

@Component({
  selector: 'mn-table',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, MnCheckbox, MnHiddenBelowDirective, MnShowAboveDirective, MnShowBelowDirective, MnInputField, MnSelect, MnSkeleton, FormsModule, MnCollectionPagination, MnButton, LucideFilter, LucideX, LucideFunnel],
  templateUrl: './mn-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnTable<T = object>
  extends MnSelectableCollectionBase<T, TableDataSource<T>> {
  @Output() sortChange = new EventEmitter<SortState | null>();
  @Output() rowClick = new EventEmitter<T>();

  currentSort: SortState | null = null;

  /** Per-column filter values keyed by column key. */
  columnFilters: ColumnFilterState = {};

  /** Viewport width (px) below which the inline filter row collapses into a panel. */
  private static readonly FILTER_COLLAPSE_WIDTH = 640;

  /**
   * True when the viewport is narrow enough that the per-column filter inputs no
   * longer fit under their headers; the inline row is then replaced by a toggle
   * button and a stacked filter panel.
   */
  protected filtersCollapsed = false;

  /** Whether the small-screen filter panel is currently expanded. */
  protected filtersPanelOpen = false;

  protected override readonly componentName = 'MnTable';

  protected get trackedToolbarTemplate(): TemplateRef<unknown> | undefined {
    return this.dataSource?.toolbarLeftTemplate;
  }

  @ViewChild('collectionBody') protected collectionBody?: ElementRef<HTMLElement>;

  /** Updates a column filter value and re-applies filtering. */
  onColumnFilter(columnKey: string, value: string): void {
    this.columnFilters[columnKey] = value;
    this.currentPage = 1;
    this.applyFilter(false);
    this.cdr.markForCheck();
  }

  /** Filter options formatted for mn-select for a given column. */
  getFilterSelectOptions(column: ColumnDefinition<T>): MnSelectOption<string>[] {
    const placeholder = column.filterPlaceholder ?? 'All';
    return [
      {label: placeholder, value: ''},
      ...(column.filterOptions ?? []).map(opt => ({label: opt.label, value: String(opt.value)})),
    ];
  }

  // ── Column Filters ──

  /** Whether any column has filtering enabled. */
  get hasColumnFilters(): boolean {
    return this.dataSource.columns.some(c => c.filterable);
  }

  /** Whether at least one column filter is active. */
  get hasActiveFilters(): boolean {
    return this.dataSource.columns.some(col => col.filterable && !!this.columnFilters[col.key]);
  }

  /** Label for the small-screen filters toggle button. */
  get filtersButtonLabel(): string {
    return this.dataSource.filtersLabel ?? 'Filters';
  }

  /** Label for the "clear all filters" action in the small-screen panel. */
  get clearFiltersButtonLabel(): string {
    return this.dataSource.clearFiltersLabel ?? 'Clear all';
  }

  /** Opens/closes the stacked filter panel shown on small screens. */
  toggleFiltersPanel(): void {
    this.filtersPanelOpen = !this.filtersPanelOpen;
  }

  /** Resets every column filter and re-applies filtering. */
  clearAllFilters(): void {
    for (const col of this.dataSource.columns) {
      if (col.filterable) this.columnFilters[col.key] = '';
    }
    this.currentPage = 1;
    this.applyFilter(false);
    this.cdr.markForCheck();
  }

  /** True when the viewport is below the filter-collapse breakpoint. */
  private isFilterViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < MnTable.FILTER_COLLAPSE_WIDTH;
  }

  /**
   * Recomputes whether the inline filter row should collapse into the panel.
   * Closes the panel when returning to the wide layout so reopened state never
   * leaks across the breakpoint. Marks for check only when the layout flips.
   */
  private updateFilterLayout(reflow: boolean): void {
    const collapsed = this.isFilterViewport();
    if (collapsed === this.filtersCollapsed) return;
    this.filtersCollapsed = collapsed;
    if (!collapsed) this.filtersPanelOpen = false;
    if (reflow) this.cdr.markForCheck();
  }

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
    this.applyFilter(false);
  }

  onRowClick(row: T): void {
    if (this.hasSelection) {
      this.toggle(row);
    }
    this.dataSource.onRowClick?.(row);
    this.rowClick.emit(row);
  }

  // ── Sorting ──

  /**
   * Resolves the skeleton placeholder config for a column's cells.
   * Falls back to a text-shaped bar at 75% width (the previous default); any
   * fields the column provides override that default.
   */
  getColumnSkeletonData(column: ColumnDefinition<T>): Partial<MnSkeletonProps> {
    const skeleton = column.skeleton;
    const overrides = skeleton && !this.isTemplateRef(skeleton) ? skeleton : {};
    return {shape: 'text', width: '75%', ...overrides};
  }

  getSortIcon(column: ColumnDefinition<T>): string {
    if (!this.currentSort || this.currentSort.columnKey !== column.key) return '';
    return this.currentSort.direction === 'asc' ? '▲' : '▼';
  }

  isSortable(column: ColumnDefinition<T>): boolean {
    return !!column.sortType && column.sortType !== ColumnSortType.NONE;
  }

  // ── Row interaction ──

  /** Rows shown per page on mobile (< md). Forced regardless of any configured pageSize. */
  private static readonly MOBILE_PAGE_SIZE = 10;

  /** Page size to use at/above the `md` breakpoint (consumer's pageSize, or the user's selection). */
  private desktopPageSize = 10;

  /** True when the viewport is below the `md` (768px) breakpoint. */
  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  /**
   * Applies the breakpoint-appropriate page size: {@link MOBILE_PAGE_SIZE} below `md`,
   * the desktop size at/above it. When the size actually changes, client-side tables
   * re-slice locally and server-side tables ask the consumer to refetch, so the
   * rendered rows update in every pagination mode (used at init and on window resize).
   */
  private applyResponsivePageSize(reflow: boolean): void {
    const target = this.isMobileViewport() ? MnTable.MOBILE_PAGE_SIZE : this.desktopPageSize;
    if (target === this.pageSize) return;
    this.invalidatePageHeight();
    this.pageSize = target;
    this.currentPage = 1;

    if (this.dataSource.paginationMode === 'client-side-pagination') {
      this.applyPagination();
    } else if (this.isServerPaginated) {
      // Server owns the slice — tell the consumer to refetch with the new size.
      this.dataSource.onPageSizeChange?.(target);
    }

    if (reflow) this.cdr.markForCheck();
  }

  /** Re-evaluate responsive page size and filter layout when the viewport changes. */
  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.applyResponsivePageSize(true);
    this.updateFilterLayout(true);
  }

  /** Tracks the desktop page size when the user picks one (selector only shows at >= md). */
  override onPageSizeChange(newSize: number): void {
    this.desktopPageSize = newSize;
    super.onPageSizeChange(newSize);
  }

  /** Sets sort/filter state seeded from the data source before the first filter pass. */
  protected override beforeInitialFilter(): void {
    super.beforeInitialFilter();

    // Force the mobile row count below `md`; use the consumer's pageSize (or 10) above it.
    this.desktopPageSize = this.dataSource.pageSize ?? 10;
    this.applyResponsivePageSize(false);

    // Seed the filter layout for the initial viewport (no markForCheck pre-render).
    this.updateFilterLayout(false);

    this.currentSort = this.dataSource.defaultSort ?? null;
    for (const col of this.dataSource.columns) {
      if (col.filterable) {
        this.columnFilters[col.key] = '';
      }
    }
  }

  // ── Template helpers ──

  getCellValue(column: ColumnDefinition<T>, row: T): string {
    if (typeof column.cell === 'function') return column.cell(row);
    return '';
  }

  /** Returns the small-screen cell value for a column with cellSm defined. */
  getCellSmValue(column: ColumnDefinition<T>, row: T): string {
    if (column.cellSm && typeof column.cellSm.cell === 'function') return column.cellSm.cell(row);
    return '';
  }

  trackByKey = (_index: number, column: ColumnDefinition<T>): string => {
    return column.key;
  };

  // ── Table CSS classes ──

  readonly tableClasses = 'w-full border-collapse overflow-y-hidden';

  get totalColumnCount(): number {
    let count = this.dataSource.columns.length;
    if (this.hasSelection) count++;
    return count;
  }

  // ── Skeleton ──

  /**
   * Resolves table-specific translation keys (column headers/filters) plus the
   * shared keys handled by the base.
   */
  protected override resolveTranslationKeys(): void {
    super.resolveTranslationKeys();
    for (const col of this.dataSource.columns) {
      if (col.headerKey) {
        col.header = this.lang.t(col.headerKey);
      }
      if (col.filterPlaceholderKey) {
        col.filterPlaceholder = this.lang.t(col.filterPlaceholderKey);
      }
    }
    if (this.dataSource.filtersLabelKey) {
      this.dataSource.filtersLabel = this.lang.t(this.dataSource.filtersLabelKey);
    }
    if (this.dataSource.clearFiltersLabelKey) {
      this.dataSource.clearFiltersLabel = this.lang.t(this.dataSource.clearFiltersLabelKey);
    }
  }

  // ── Filtering & sorting ──

  protected applyFilter(searchForItems: boolean): void {
    let items = this.applySearchFilter(this.dataSource.dataRows.value ?? []);

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
          return (cellValue ?? '').toLowerCase().includes(term);
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
          return (new Date(va as string | number).getTime() - new Date(vb as string | number).getTime()) * dir;
        default:
          return 0;
      }
    });
  }
}
