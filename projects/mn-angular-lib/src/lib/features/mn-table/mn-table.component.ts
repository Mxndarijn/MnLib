import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
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

/** Map of column key to its current filter value. */
export type ColumnFilterState = Record<string, string | undefined>;

@Component({
  selector: 'mn-table',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, MnCheckbox, MnHiddenBelowDirective, MnShowAboveDirective, MnShowBelowDirective, MnInputField, MnSelect, MnSkeleton, FormsModule, MnCollectionPagination],
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

  /** Sets sort/filter state seeded from the data source before the first filter pass. */
  protected override beforeInitialFilter(): void {
    super.beforeInitialFilter();
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
