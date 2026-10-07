import {
  afterEveryRender,
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Injector,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {NgClass, NgTemplateOutlet} from '@angular/common';
import {debounceTime, Subject} from 'rxjs';
import {
  ColumnDefinition,
  ColumnFilterState,
  ColumnFilterType,
  ColumnFilterValue,
  ColumnSortType,
  MnColumnFilter,
  MnRowValue,
  MnTableRowAction,
  SortState,
  TableDataSource,
} from './mn-table.types';
import {emptyFilterValue, isFilterValueActive, matchesColumnFilter} from './mn-table-filter.util';
import {MnTableRowLayout, resolveRowLayout} from './mn-table-row-layout.util';
import {MnSkeleton, MnSkeletonProps} from 'mn-angular-lib/button';
import {MnSelect, MnSelectOption} from 'mn-angular-lib/forms';
import {MnMultiSelect, MnMultiSelectOption} from 'mn-angular-lib/forms';
import {MnActionIcon, MnDropdown, MnDropdownAction, MnDropdownActionColor} from 'mn-angular-lib/forms';
import {MnCheckbox} from 'mn-angular-lib/forms';
import {MnHiddenBelowDirective} from './mn-hidden-below.directive';
import {MnShowAboveDirective} from './mn-show-above.directive';
import {MnShowBelowDirective} from './mn-show-below.directive';
import {MnInputField} from 'mn-angular-lib/forms';
import {FormsModule} from '@angular/forms';
import {MnCollectionPagination, MnSelectableCollectionBase} from '../mn-collection';
import {MnButton} from 'mn-angular-lib/button';
import {MnBottomSheet} from 'mn-angular-lib/bottom-sheet';
import { LucideDynamicIcon } from '@lucide/angular';
import * as lucide from 'lucide';
import { lucideIcons, MN_IN_BOTTOM_SHEET, MN_IN_MODAL } from 'mn-angular-lib/core';

/** Lucide icons this file renders. */
const ICONS = lucideIcons({
  ArrowDown: lucide.ArrowDown,
  ArrowUp: lucide.ArrowUp,
  ChevronRight: lucide.ChevronRight,
  Ellipsis: lucide.Ellipsis,
  Funnel: lucide.Funnel,
  X: lucide.X,
});

/** A string cell with nothing to say: blank, or a lone dash (hyphen, en or em dash). */
const EMPTY_VALUE = /^\s*[-–—]?\s*$/;

/** What tapping a composed row does: select it, run the consumer's handler, open the sheet, or nothing. */
export type MnTableRowTap = 'select' | 'click' | 'detail' | 'none';


@Component({
  selector: 'mn-table',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, MnCheckbox, MnHiddenBelowDirective, MnShowAboveDirective, MnShowBelowDirective, MnInputField, MnSelect, MnMultiSelect, MnDropdown, MnSkeleton, FormsModule, MnCollectionPagination, MnButton, MnBottomSheet, LucideDynamicIcon],
  templateUrl: './mn-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block-level so the host has a definite width for the @container chrome inside it.
  host: {class: 'block'},
})
export class MnTable<T = object>
  extends MnSelectableCollectionBase<T, TableDataSource<T>> {
  /** Lucide icons the template renders. */
  protected readonly icons = ICONS;

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

  /** Whether the small-screen filter bottom sheet is currently open. */
  protected filtersPanelOpen = false;

  /** Small-screen filter sheet, held so the close button can play its exit. */
  @ViewChild('filtersSheet') protected filtersSheet?: MnBottomSheet;

  // ── Row mode (below 640px) ──

  /**
   * Whether this table renders inside an mn modal. There it never opens its own detail sheet:
   * on a phone the modal already is a sheet, and a second one stacks two drawers on one screen.
   * Actions stay reachable through a ⋯ menu on the row instead.
   */
  private readonly inModal = inject(MN_IN_MODAL);

  /** For scheduling focus once the detail sheet has rendered. */
  private readonly injector = inject(Injector);

  /**
   * The injector the filter sheet renders its fields with. The field template is declared
   * outside the sheet, so on its own it injects from there and its selects would open a second
   * sheet on top; this one says they are already in a sheet.
   */
  protected readonly inSheetInjector = Injector.create({
    providers: [{provide: MN_IN_BOTTOM_SHEET, useValue: true}],
    parent: this.injector,
  });

  /** The row whose detail sheet is open, or null when none is. */
  protected detailRow: T | null = null;

  /** The control that opened the detail sheet, which gets focus back when it closes. */
  private detailTrigger: HTMLElement | null = null;

  /** Detail sheet, held so an action can play its exit before running. */
  @ViewChild('detailSheet') protected detailSheet?: MnBottomSheet;

  /** The sheet's heading, focused on open so the sheet is announced and Escape reaches it. */
  @ViewChild('detailHeading') protected detailHeading?: ElementRef<HTMLElement>;

  /** The last derived row layout and the column config it was derived from. */
  private layoutCache?: { columns: ColumnDefinition<T>[]; signature: string; layout: MnTableRowLayout<T> };

  /** Counts tables on the page, so each sort radio group gets a name of its own. */
  private static instanceCount = 0;

  /** The `name` that ties this table's sort radios into one group. */
  protected readonly sortGroupName = `mn-table-sort-${MnTable.instanceCount++}`;

  /**
   * Whether rows render as composed lines instead of a grid. The same 640px container width
   * at which the filter row already collapses: below it neither the filter inputs nor the
   * columns have room, so both give way at once.
   */
  get rowMode(): boolean {
    return this.filtersCollapsed;
  }

  /**
   * Which column goes where on a composed row, derived from the column config (see
   * {@link resolveRowLayout}). Recomputed only when the columns, or a setting the rule reads,
   * change — a consumer adding a permission-gated column later is picked up.
   */
  get rowLayout(): MnTableRowLayout<T> {
    const columns = this.dataSource.columns;
    const signature = columns
      .map(c => [c.key, c.hiddenBelow, c.mobile, c.width, c.sortType, c.align, c.actions ? 'a' : ''].join('|'))
      .join(';');
    const cached = this.layoutCache;
    if (cached && cached.signature === signature && cached.columns.length === columns.length
      && columns.every((c, i) => c === cached.columns[i])) {
      return cached.layout;
    }
    const layout = resolveRowLayout(columns);
    this.layoutCache = {columns: [...columns], signature, layout};
    return layout;
  }

  /**
   * Every value column the detail sheet lists under its heading: all of them except the two
   * the heading itself shows (title and trailing), so the sheet is the whole record.
   */
  get detailColumns(): ColumnDefinition<T>[] {
    const {title, trailing} = this.rowLayout;
    return this.dataSource.columns.filter(c => !c.actions && c !== title && c !== trailing && c.mobile !== 'hidden');
  }

  /** Whether any of the row's action columns has a visible action for it. */
  rowHasAnyActions(row: T): boolean {
    return this.rowLayout.actions.some(column => this.hasRowActions(column, row));
  }

  /**
   * Whether a row has anything its composed line does not show: a column only the sheet
   * lists, or an action. Never inside a modal, where the table opens no sheet.
   */
  rowHasDetail(row: T): boolean {
    if (this.inModal) return false;
    return this.rowLayout.sheet.length > 0 || this.rowHasAnyActions(row);
  }

  /**
   * What a tap on a composed row does, in order of precedence: select it (a selection table),
   * run the consumer's row handler as on a wide table, open the detail sheet, or nothing.
   */
  rowTap(row: T): MnTableRowTap {
    if (this.hasSelection) return 'select';
    if (this.dataSource.onRowClick || this.rowClick.observed) return 'click';
    if (this.rowHasDetail(row)) return 'detail';
    return 'none';
  }

  /**
   * Whether a row needs its own ⋯ button for the sheet, because a tap already does something
   * else. A row that opens the consumer's own detail (`onRowClick`) gets one only for actions:
   * a sheet with nothing but the same record next to that detail was two views of one row.
   */
  showsRowMore(row: T): boolean {
    const tap = this.rowTap(row);
    if (tap === 'click') return !this.inModal && this.rowHasAnyActions(row);
    return tap === 'select' && this.rowHasDetail(row);
  }

  /** Whether a row shows its actions as a ⋯ menu: inside a modal, where there is no sheet. */
  showsRowMenu(row: T): boolean {
    return this.inModal && this.rowHasAnyActions(row);
  }

  /** Handles a tap on a composed row's main area. */
  onRowTap(row: T, event: Event): void {
    if (this.rowTap(row) === 'detail') {
      this.openDetail(row, event.currentTarget as HTMLElement | null);
    } else {
      this.onRowClick(row);
    }
  }

  /**
   * Opens the detail sheet for a row and moves focus to its heading.
   * @param row The row.
   * @param trigger The control that opened it, which gets focus back on close.
   */
  openDetail(row: T, trigger: HTMLElement | null = null): void {
    this.detailRow = row;
    this.detailTrigger = trigger;
    this.cdr.markForCheck();
    afterNextRender(() => this.detailHeading?.nativeElement.focus(), {injector: this.injector});
  }

  /** Plays the detail sheet's exit, then unmounts it. */
  async closeDetail(): Promise<void> {
    await this.detailSheet?.startClosing();
    this.onDetailDismissed();
  }

  /** Clears the detail sheet once it is gone and returns focus to the control that opened it. */
  onDetailDismissed(): void {
    if (this.detailRow === null) return;
    this.detailRow = null;
    const trigger = this.detailTrigger;
    this.detailTrigger = null;
    this.cdr.markForCheck();
    trigger?.focus();
  }

  /**
   * Runs an action from the detail sheet. The sheet closes first, so an action that opens a
   * modal or navigates does not do so underneath it.
   */
  async runDetailAction(action: MnTableRowAction<T>, row: T): Promise<void> {
    if (this.isRowActionDisabled(action, row)) return;
    await this.closeDetail();
    action.run(row);
  }

  /**
   * The text a composed row shows for a string column: the full cell. Not `cellSm` — that is the
   * short form an app wrote for a squeezed grid column (an e-mail cut to ten characters, a status
   * reduced to an icon), and a composed row has the room the grid column lacked.
   */
  rowCellText(column: ColumnDefinition<T>, row: T): string {
    return this.getCellValue(column, row);
  }

  /** The template a composed row renders for a column; null for a string column. */
  rowCellTemplate(column: ColumnDefinition<T>): TemplateRef<unknown> | null {
    return this.isTemplateRef(column.cell) ? column.cell : null;
  }

  /**
   * Whether a cell is empty for this row: what the column's `isEmpty` says, else for a string
   * cell blank or the lone dash an app writes for "nothing". Such a value is left off the
   * composed row and the detail sheet ("Beschrijving: -" said nothing). A template cell without
   * `isEmpty` is never judged empty — its markup is the app's.
   */
  rowValueEmpty(column: ColumnDefinition<T>, row: T): boolean {
    if (column.isEmpty) return column.isEmpty(row);
    if (this.rowCellTemplate(column)) return false;
    return EMPTY_VALUE.test(this.rowCellText(column, row));
  }

  /** The second-line columns that have something to show for this row. */
  rowMeta(row: T): ColumnDefinition<T>[] {
    return this.rowLayout.meta.filter(column => !this.rowValueEmpty(column, row));
  }

  /**
   * The column name a composed row shows beside a second-line or right-side value: with no
   * header row, "Lid", "1-12-2023" or "535" alone does not say what it is. Empty for a template
   * cell — a badge or an icon carries its own meaning, and its markup is the app's.
   */
  rowSlotLabel(column: ColumnDefinition<T>): string {
    // Templated values (an amount, a score) are labelled too: the label sits above them,
    // clear of the app's markup.
    return this.headerText(column);
  }

  /** A row's name as text, for accessible names: its title cell, else the selection label. */
  rowLabel(row: T): string {
    const title = this.rowLayout.title;
    const text = title ? this.getCellValue(title, row) : '';
    return text || this.defaultSelectionLabel(row) || '';
  }

  /** Accessible name of a row's ⋯ button. */
  rowDetailsLabel(row: T): string {
    return this.resolveLabel(undefined, 'mnCollection.rowDetails', 'Details for {{label}}')
      .replace('{{label}}', this.rowLabel(row));
  }

  /** Columns a person can sort by, offered in the filter sheet once the header row is gone. */
  get sortableColumns(): ColumnDefinition<T>[] {
    return this.dataSource.columns.filter(c => this.isSortable(c));
  }

  /**
   * Whether the toolbar shows the filter button: below 640px, when there is a filter to set or
   * a sort to choose — the header row that held both is gone there. Not over an empty or
   * one-row list, where there is nothing to narrow or order, unless a filter or sort is
   * already set (then the button is how to undo it).
   */
  get showsFilterButton(): boolean {
    if (!this.filtersCollapsed || !(this.hasColumnFilters || this.sortableColumns.length > 0)) return false;
    return this.totalItemCount > 1 || this.activeFilterCount > 0 || !!this.currentSort;
  }

  /**
   * Whether the search field shows: as always on a wide table, but below 640px not over an empty
   * or one-row list (there is nothing to find), unless a search is already typed or rows are
   * still loading.
   */
  get showsSearch(): boolean {
    if (!this.isSearchable) return false;
    if (!this.rowMode) return true;
    return this.isLoadingState || this.totalItemCount > 1 || !!this.searchValue;
  }

  /**
   * Whether the pagination strip shows. Below 640px not for a single page: "Page 1 of 1" under
   * an empty or short list is chrome with nothing to do. Above it the strip stays as it was.
   */
  get showsPagination(): boolean {
    if (this.showsPhoneLoadMore) return false;
    return !this.rowMode || this.totalPages > 1 || this.showLoadMore;
  }

  /**
   * Whether a paginated table offers "Load more" instead of the pager: below 640px, on the first
   * page, while rows remain and the next size stays within {@link MnCollectionDataSource.maxPageSize}.
   * A tap grows the page instead of appending the next one, so a consumer that reloads after an
   * edit or a delete gets the whole visible list back rather than one page under stale rows.
   */
  get showsPhoneLoadMore(): boolean {
    if (!this.rowMode || !this.isPaginated || this.currentPage !== 1) return false;
    const clientSide = this.dataSource.paginationMode === 'client-side-pagination';
    // A server-side consumer that cannot change its page size could never answer the tap.
    if (!clientSide && !this.dataSource.onPageSizeChange) return false;
    return this.phoneShownCount < this.totalItemCount && this.nextPhonePageSize() > this.phoneShownCount;
  }

  /**
   * How many rows the phone list shows. A server-side consumer's rows, not the size asked for:
   * a consumer that answers an older, bigger request last shows more than {@link pageSize}.
   */
  private get phoneShownCount(): number {
    return this.dataSource.paginationMode === 'client-side-pagination'
      ? Math.min(this.pageSize, this.totalItemCount)
      : this.paginatedItems.length;
  }

  /** How far the phone list has grown, as "10 of 48". */
  get phoneLoadedLabel(): string {
    const shown = this.phoneShownCount;
    const total = this.totalItemCount;
    return this.lang.translateIfPresent('mnCollection.loadedCount', {shown, total}) ?? `${shown} of ${total}`;
  }

  /** The phone "Load more" button's label: the consumer's, the app's convention key, or English. */
  get phoneLoadMoreLabel(): string {
    return this.dataSource.labels?.loadMore ?? this.resolveLabel(undefined, 'mnCollection.loadMore', 'Load more');
  }

  /** A grown phone list has no pager to hold steady, so it keeps no full-page height floor. */
  override get reservedPageHeight(): number {
    return this.phoneLoadStep ? 0 : super.reservedPageHeight;
  }

  /**
   * Grows the phone list by one step: a client-side table shows more of the rows it holds, a
   * server-side one asks its consumer for a bigger first page. The rows on screen stay there
   * while that loads ({@link phoneLoadingMore}); skeletons would throw the reader back to the top.
   */
  loadMorePhoneRows(): void {
    if (!this.showsPhoneLoadMore || this.phoneLoadingMore) return;
    if (!this.phoneLoadStep) this.phoneLoadStep = this.pageSize;
    const size = this.nextPhonePageSize();
    this.invalidatePageHeight();
    this.pageSize = size;
    if (this.dataSource.paginationMode === 'client-side-pagination') {
      this.applyPagination();
    } else {
      this.phoneLoadingMore = true;
      this.dataSource.onPageSizeChange?.(size);
    }
    this.cdr.markForCheck();
  }

  /**
   * The page size the next "Load more" asks for: one step more than the rows shown, capped for a
   * server.
   * @returns The next size; equal to the rows shown when the cap is reached.
   */
  private nextPhonePageSize(): number {
    const step = this.phoneLoadStep || this.pageSize;
    const shown = this.phoneShownCount;
    const cap = this.dataSource.paginationMode === 'client-side-pagination'
      ? Number.POSITIVE_INFINITY
      : Math.max(this.dataSource.maxPageSize ?? MnTable.DEFAULT_MAX_PAGE_SIZE, shown);
    return Math.min(shown + step, cap);
  }

  /** Fresh rows answer a "Load more": the button stops spinning. */
  protected override onRowsChanged(): void {
    super.onRowsChanged();
    this.phoneLoadingMore = false;
  }

  /** A failed "Load more" shows the error, not a button that spins forever. */
  override ngDoCheck(): void {
    super.ngDoCheck();
    if (this.phoneLoadingMore && this.isErrorState) this.phoneLoadingMore = false;
  }

  /** How many column filters are set, shown as a count on the filter button. */
  get activeFilterCount(): number {
    return this.activeColumnFilters.length;
  }

  /**
   * Title of the small-screen sheet and its button: "Filters" when there is something to filter,
   * "Sort by" when the sheet only holds the sort choice — a funnel over a sheet with no filter in
   * it promises something the sheet does not have.
   */
  get filterSheetLabel(): string {
    return this.hasColumnFilters ? this.filtersButtonLabel : this.sortByLabel;
  }

  /** Accessible name of the icon-only filter button, with the active count when there is one. */
  get filtersButtonAriaLabel(): string {
    const count = this.activeFilterCount;
    return count > 0 ? `${this.filterSheetLabel} (${count})` : this.filterSheetLabel;
  }

  /** Label of the sort select in the filter sheet. */
  get sortByLabel(): string {
    return this.resolveLabel(undefined, 'mnCollection.sortBy', 'Sort by');
  }

  /** The sort select's "no sort" option. */
  get sortDefaultLabel(): string {
    return this.resolveLabel(undefined, 'mnCollection.sortDefault', 'Default order');
  }

  /** The current sort direction in words, shown on the chosen column's direction button. */
  get sortDirectionLabel(): string {
    return this.currentSort?.direction === 'desc'
      ? this.resolveLabel(undefined, 'mnCollection.sortDescending', 'Descending')
      : this.resolveLabel(undefined, 'mnCollection.sortAscending', 'Ascending');
  }

  /** Accessible name of the direction button: what it shows and that a press flips it. */
  get sortDirectionButtonLabel(): string {
    return this.resolveLabel(undefined, 'mnCollection.sortDirection', '{{direction}}, tap to reverse')
      .replace('{{direction}}', this.sortDirectionLabel);
  }

  /** Flips the current sort between ascending and descending. */
  toggleSortDirection(): void {
    if (!this.currentSort) return;
    this.onSortDirection(this.currentSort.direction === 'desc' ? 'asc' : 'desc');
  }

  /**
   * Sorts by a column chosen in the filter sheet, exactly as a header click would. A newly
   * chosen column starts ascending; re-choosing the current one keeps its direction.
   * @param columnKey The column, or empty for the default order.
   */
  onSortColumn(columnKey: string): void {
    if (!columnKey) {
      this.applySort(null);
    } else {
      const direction = this.currentSort?.columnKey === columnKey ? this.currentSort.direction : 'asc';
      this.applySort({columnKey, direction});
    }
  }

  /**
   * Flips the direction of the current sort from the sheet's switch.
   * @param direction The value the switch emitted.
   */
  onSortDirection(direction: string): void {
    if (!this.currentSort) return;
    this.applySort({columnKey: this.currentSort.columnKey, direction: direction === 'desc' ? 'desc' : 'asc'});
  }

  /** Sets the sort, tells the consumer and re-sorts, as a header click does. */
  private applySort(sort: SortState | null): void {
    this.currentSort = sort;
    this.sortChange.emit(this.currentSort);
    this.applyFilter(false);
    this.cdr.markForCheck();
  }

  protected override readonly componentName = 'MnTable';

  protected get trackedToolbarTemplate(): TemplateRef<unknown> | undefined {
    return this.dataSource?.toolbarLeftTemplate;
  }

  @ViewChild('collectionBody') protected collectionBody?: ElementRef<HTMLElement>;

  // ── Column Filters ──
  /** Debounces server-side text filters so typing doesn't fire a request per keystroke. */
  private readonly filterDebounce = new Subject<void>();
  /**
   * Most rows shown per page on mobile (< md). A **cap**, not an override: a data
   * source asking for fewer rows keeps its own size. Raising a small page size on
   * a phone is the opposite of what it is for — it pushes the paginator below the
   * fold, which is most damaging inside a modal, where the sheet is already short
   * and its footer is pinned over the bottom of the table.
   */
  private static readonly MOBILE_PAGE_SIZE = 10;

  /** {@link MnCollectionDataSource.maxPageSize} when the consumer sets none. */
  private static readonly DEFAULT_MAX_PAGE_SIZE = 100;

  /** Rows one phone "Load more" tap adds: the page size before the first tap; 0 while not grown. */
  private phoneLoadStep = 0;

  /** Whether a phone "Load more" refetch is in flight: rows stay up and the button spins. */
  protected phoneLoadingMore = false;
  /**
   * The component's own element, measured for every responsive decision. Typed via
   * the annotation, not `inject(ElementRef<HTMLElement>)` — that form is a generic
   * call on the token and leaves `nativeElement` untyped.
   */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** Whether the consumer owns filtering (server-side), mirroring {@link isServerSearched}. */
  get isServerFiltered(): boolean {
    return !!this.dataSource.onColumnFilterChange;
  }

  /** Every column filter that is actually set, in column order. */
  get activeColumnFilters(): MnColumnFilter[] {
    return this.dataSource.columns
      .filter(col => col.filterable && isFilterValueActive(this.columnFilters[col.key]))
      .map(col => ({
        key: col.key,
        type: this.filterTypeOf(col),
        value: this.columnFilters[col.key] as ColumnFilterValue,
      }));
  }

  /** Whether at least one column filter is active. */
  get hasActiveFilters(): boolean {
    return this.dataSource.columns.some(
      col => col.filterable && isFilterValueActive(this.columnFilters[col.key]),
    );
  }

  /**
   * Updates a column filter value and either re-filters locally or hands the
   * active filters to the consumer. Server-side text filters are debounced;
   * every other type commits immediately.
   */
  onColumnFilter(column: ColumnDefinition<T>, value: ColumnFilterValue): void {
    this.columnFilters[column.key] = value;
    this.currentPage = 1;

    if (this.isServerFiltered) {
      if (this.filterTypeOf(column) === 'text') {
        this.filterDebounce.next();
      } else {
        this.emitServerFilters();
      }
    } else {
      this.applyFilter(false);
    }
    this.cdr.markForCheck();
  }

  /** Updates a tri-state boolean filter from its select ('' = any). */
  onBooleanFilter(column: ColumnDefinition<T>, raw: string): void {
    this.onColumnFilter(column, raw === '' ? '' : raw === 'true');
  }

  /** The effective filter type of a column, defaulting to text. */
  filterTypeOf(column: ColumnDefinition<T>): ColumnFilterType {
    return column.filterType ?? 'text';
  }

  /** Whether a specific column's filter currently narrows the rows. */
  isColumnFilterActive(column: ColumnDefinition<T>): boolean {
    return isFilterValueActive(this.columnFilters[column.key]);
  }

  /** Filter options formatted for mn-multi-select for a given column. */
  getFilterMultiSelectOptions(column: ColumnDefinition<T>): MnMultiSelectOption<string>[] {
    return (column.filterOptions ?? []).map(opt => ({label: opt.label, value: String(opt.value)}));
  }

  /** Label for the small-screen filters toggle button. */
  get filtersButtonLabel(): string {
    return this.resolveLabel(this.dataSource.filtersLabelKey, 'mnCollection.filters', this.dataSource.filtersLabel ?? 'Filters');
  }

  /**
   * Summary a multi-select filter collapses to once more than one option is picked.
   * Resolved with the `{count}` token intact for mn-multi-select to fill in.
   */
  get filterSelectedLabel(): string {
    return this.resolveLabel(this.dataSource.filterLabels?.selectedKey, 'mnCollection.filterSelected', this.dataSource.filterLabels?.selected ?? '{count} selected');
  }

  /** Current text/select filter value for a column. */
  textFilterValue(column: ColumnDefinition<T>): string {
    const value = this.columnFilters[column.key];
    return typeof value === 'string' ? value : '';
  }

  /** Current multi-select filter value for a column. */
  multiFilterValue(column: ColumnDefinition<T>): string[] {
    const value = this.columnFilters[column.key];
    return Array.isArray(value) ? value : [];
  }

  /** Current boolean filter value for a column, as the select's string value. */
  booleanFilterValue(column: ColumnDefinition<T>): string {
    const value = this.columnFilters[column.key];
    return typeof value === 'boolean' ? String(value) : '';
  }

  /** Resets every column filter and re-applies (or re-requests) filtering. */
  clearAllFilters(): void {
    this.seedFilterValues();
    this.currentPage = 1;
    if (this.isServerFiltered) {
      this.emitServerFilters();
    } else {
      this.applyFilter(false);
    }
    this.cdr.markForCheck();
  }

  /** Whether any column has filtering enabled. */
  get hasColumnFilters(): boolean {
    return this.dataSource.columns.some(c => c.filterable);
  }

  /** Label for the "clear all filters" action in the small-screen panel. */
  get clearFiltersButtonLabel(): string {
    return this.resolveLabel(this.dataSource.clearFiltersLabelKey, 'mnCollection.clearAll', this.dataSource.clearFiltersLabel ?? 'Clear all');
  }

  /** Accessible label for the filter sheet's close button. */
  get filtersCloseLabel(): string {
    return this.resolveLabel(undefined, 'mnCollection.close', 'Close');
  }

  /** Heading for the selection summary, with the count filled in. */
  get selectionSummaryTitle(): string {
    const labels = this.dataSource.selectionSummaryLabels;
    const template = this.resolveLabel(labels?.titleKey, 'mnCollection.selectedCount', labels?.title ?? 'Selected ({{count}})');
    return template.replace('{{count}}', String(this.selectedIds.size));
  }

  /** Label for the summary's clear-everything action. */
  get selectionClearAllLabel(): string {
    const labels = this.dataSource.selectionSummaryLabels;
    return this.resolveLabel(labels?.clearAllKey, 'mnCollection.clearAll', labels?.clearAll ?? 'Clear all');
  }

  /** Opens the small-screen filter bottom sheet. */
  openFiltersPanel(): void {
    this.filtersPanelOpen = true;
  }

  /** Plays the sheet's slide-down exit, then unmounts it. */
  async closeFiltersPanel(): Promise<void> {
    await this.filtersSheet?.startClosing();
    this.filtersPanelOpen = false;
    this.cdr.markForCheck();
  }
  private readonly baseTableClasses = 'w-full border-collapse overflow-y-hidden';
  /**
   * Column widths measured from the automatic layout and pinned, keyed by column
   * key, for `stable`. Empty until the first render that has real rows on screen,
   * and cleared whenever the table is resized so the next render re-measures.
   */
  private pinnedWidths = new Map<string, string>();

  /** Sets sort/filter state seeded from the data source before the first filter pass. */
  protected override beforeInitialFilter(): void {
    super.beforeInitialFilter();

    // Force the mobile row count below `md`; use the consumer's pageSize (or 10) above it.
    this.desktopPageSize = this.dataSource.pageSize ?? 10;
    this.applyResponsivePageSize(false);

    // Seed the filter layout for the initial viewport (no markForCheck pre-render).
    this.updateFilterLayout(false);

    this.currentSort = this.dataSource.defaultSort ?? null;
    this.seedFilterValues();
  }
  /**
   * Whether {@link pinColumnWidths} has run. Tracked separately from
   * {@link pinnedWidths} being non-empty, because the widest column is deliberately
   * left unpinned and a table with a single flexible column therefore pins nothing.
   */
  private widthsPinned = false;

  /**
   * Recomputes whether the inline filter row should collapse into the panel.
   * Closes the panel when returning to the wide layout so reopened state never
   * leaks across the breakpoint. Marks for check only when the layout flips.
   */
  private updateFilterLayout(reflow: boolean): void {
    const collapsed = this.isFilterViewport();
    if (collapsed === this.filtersCollapsed) return;
    this.filtersCollapsed = collapsed;
    if (!collapsed) {
      this.filtersPanelOpen = false;
      // The wide table shows every column, so the detail sheet has nothing left to add.
      this.detailRow = null;
      this.detailTrigger = null;
    }
    // Composed rows and grid rows differ in height; the floor measured for one does not fit the other.
    this.invalidatePageHeight();
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

  /**
   * Whether clicking a row does anything: a data-source `onRowClick`, a bound `(rowClick)`,
   * or row selection. Only then does a row get the hover wash and the pointer, so a plain
   * list does not look like one that opens something. `appearance.hover: false` still turns
   * the wash off on a clickable table.
   */
  get rowsClickable(): boolean {
    return this.hasSelection || !!this.dataSource.onRowClick || this.rowClick.observed;
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

  /**
   * Accessible name for a column's inline filter control: the header text, or the column key when
   * the header is a template.
   * @param column - The filtered column.
   */
  filterLabel(column: ColumnDefinition<T>): string {
    return typeof column.header === 'string' ? this.headerText(column) : column.key;
  }

  /**
   * A string column's header text. `headerKey` is translated here, at render time, rather than
   * only in `resolveTranslationKeys`: that runs on init and on a locale change, so a column a
   * consumer adds afterwards (a permission-gated actions or image column) kept an empty header,
   * which a screen reader announces as a nameless column.
   * @param column - The column whose header is shown.
   * @returns The translated key when the column has one, otherwise its literal header, or an
   *   empty string for a template header (rendered through its own outlet instead).
   */
  headerText(column: ColumnDefinition<T>): string {
    if (column.headerKey) {
      return this.lang.t(column.headerKey);
    }
    return typeof column.header === 'string' ? column.header : '';
  }

  isSortable(column: ColumnDefinition<T>): boolean {
    return !!column.sortType && column.sortType !== ColumnSortType.NONE;
  }

  // ── Row interaction ──

  constructor() {
    super();
    // Server-side text filtering only: client-side filtering stays instant per keystroke.
    this.filterDebounce
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => {
        this.emitServerFilters();
        this.cdr.markForCheck();
      });

    // Watch the table's own box rather than the window: inside a modal, a sidebar
    // or a narrow grid cell the table resizes without the window ever changing,
    // and the window resizes without the table's share of it changing.
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => this.onHostResize());
      observer.observe(this.host.nativeElement);
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }

    // `beforeInitialFilter` runs while the host may not be attached or laid out
    // yet, so its width reads 0 and {@link measuredWidth} has to guess from the
    // window — the one guess that is wrong for a table in a modal. Re-evaluate
    // once after the first render, when the real width is available.
    afterNextRender(() => this.onHostResize());

    // The `stable` layout has to let the browser lay the table out automatically
    // once before it can capture the result. This runs after every render because
    // the first render usually has no rows yet (a server fetch is still in flight);
    // the guards below make it a no-op until real rows are on screen, and the
    // pinned widths then stop it from measuring again.
    afterEveryRender(() => {
      if (this.layoutMode !== 'stable' || this.rowMode) return;
      if (this.widthsPinned || this.isLoadingState) return;
      if (this.paginatedItems.length === 0) return;
      this.pinColumnWidths();
    });
  }

  /**
   * Classes for the `<table>` element. `table-fixed` is added once column widths
   * are no longer allowed to follow the content: always for the `fixed` layout, and
   * for `stable` from the moment its widths have been measured and pinned.
   */
  get tableClasses(): string {
    return this.widthsArePinned ? `${this.baseTableClasses} table-fixed` : this.baseTableClasses;
  }

  /** Page size to use at/above the `md` breakpoint (consumer's pageSize, or the user's selection). */
  private desktopPageSize = 10;

  /** Label for the summary's expand/collapse control. */
  get selectionSummaryToggleLabel(): string {
    const labels = this.dataSource.selectionSummaryLabels;
    if (this.selectionSummaryExpanded) {
      return this.resolveLabel(labels?.showLessKey, 'mnCollection.showLess', labels?.showLess ?? 'Show less');
    }
    const template = this.resolveLabel(labels?.showMoreKey, 'mnCollection.showMore', labels?.showMore ?? '+{{count}} more');
    return template.replace('{{count}}', String(this.hiddenSelectionCount));
  }

  /** Placeholder and accessible name for the search box. */
  get searchPlaceholderLabel(): string {
    return this.resolveLabel(
      this.dataSource.searchPlaceholderKey,
      'mnCollection.search',
      this.dataSource.searchPlaceholder ?? 'Search...',
    );
  }

  /** Screen-reader-only header text of the selection column, so that column is never nameless. */
  get selectionColumnLabel(): string {
    return this.resolveLabel(undefined, 'mnCollection.selectionColumn', 'Selection');
  }

  /** Accessible name for the scrollable table region. */
  get tableRegionLabel(): string {
    return this.resolveLabel(this.dataSource.ariaLabel, 'mnCollection.dataTable', 'Data table');
  }

  /**
   * Fewer tags once the table is narrow. A tag holding a person's full name takes
   * a whole line at phone width, so the eight that read as a compact header on a
   * wide table become eight stacked lines in a modal sheet — the summary then
   * occupies more of the screen than the rows it is summarising.
   *
   * Reuses {@link filtersCollapsed} rather than measuring again: it is already
   * maintained on every resize and means exactly "this table is under 640px".
   * The heading still states the true total, so the hidden tags cost no information.
   */
  protected override get defaultSelectionSummaryLimit(): number {
    return this.filtersCollapsed ? 5 : 8;
  }

  /** Tracks the desktop page size when the user picks one (selector only shows at >= md). */
  override onPageSizeChange(newSize: number): void {
    this.desktopPageSize = newSize;
    super.onPageSizeChange(newSize);
  }

  /** The effective column-width strategy, defaulting to `stable`. */
  get layoutMode(): 'auto' | 'fixed' | 'stable' {
    return this.dataSource.appearance?.layout ?? 'stable';
  }

  /**
   * Whether column widths have stopped following the cell content — `fixed` always,
   * `stable` once {@link pinColumnWidths} has captured them. Drives `table-fixed`
   * and the cell truncation together, so a cell is never clipped while the column
   * it sits in could still have grown to fit it.
   */
  get widthsArePinned(): boolean {
    return this.layoutMode === 'fixed' || (this.layoutMode === 'stable' && this.widthsPinned);
  }

  /** Any / Yes / No options for a boolean column filter. */
  getBooleanFilterOptions(column: ColumnDefinition<T>): MnSelectOption<string>[] {
    const labels = this.dataSource.filterLabels;
    return [
      {
        label: column.filterPlaceholder ?? this.resolveLabel(labels?.anyKey, 'mnCollection.filterAny', labels?.any ?? 'Any'),
        value: ''
      },
      {label: this.resolveLabel(labels?.yesKey, 'mnCollection.filterYes', labels?.yes ?? 'Yes'), value: 'true'},
      {label: this.resolveLabel(labels?.noKey, 'mnCollection.filterNo', labels?.no ?? 'No'), value: 'false'},
    ];
  }

  /**
   * The width to render for a column: the consumer's own declared width always
   * wins, then a width pinned by the `stable` layout, otherwise none.
   * @param column The column being rendered.
   * @returns A CSS width, or `null` to leave it to the layout algorithm.
   */
  columnWidth(column: ColumnDefinition<T>): string | null {
    return column.width ?? this.pinnedWidths.get(column.key) ?? null;
  }

  /**
   * The `title` tooltip for a cell, so text truncated by a pinned column stays
   * readable. Only string cells have text to expose; template cells render their
   * own markup and are left alone.
   * @param column The column being rendered.
   * @param row The row being rendered.
   * @returns The full cell text, or `null` when there is nothing to expose.
   */
  cellTitle(column: ColumnDefinition<T>, row: T): string | null {
    if (!this.widthsArePinned || typeof column.cell !== 'function') return null;
    return column.cell(row) || null;
  }

  /**
   * Falls back to the first column that renders a plain string, which is almost
   * always the name-like column a person would use to identify the row. Template
   * columns are skipped: they render markup this cannot flatten to a tag label.
   * @param row The selected row.
   * @returns The label, or null when every column renders a template.
   */
  protected override defaultSelectionLabel(row: T): string | null {
    for (const column of this.dataSource.columns) {
      if (typeof column.cell !== 'function') continue;
      const value = column.cell(row);
      if (value) return value;
    }
    return null;
  }

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
      // Row actions are deliberately not pre-resolved here: `rowActionLabel` translates
      // at render time (a locale change calls markForCheck, so the next pass picks the
      // new text up), which keeps a per-row `label`/`labelKey` accessor intact instead
      // of being flattened to one string for every row.
    }
    if (this.dataSource.filtersLabelKey) {
      this.dataSource.filtersLabel = this.lang.t(this.dataSource.filtersLabelKey);
    }
    if (this.dataSource.clearFiltersLabelKey) {
      this.dataSource.clearFiltersLabel = this.lang.t(this.dataSource.clearFiltersLabelKey);
    }
    this.resolveFilterLabelKeys();
    this.resolveSelectionSummaryKeys();
  }

  protected applyFilter(searchForItems: boolean): void {
    let items = this.applySearchFilter(this.dataSource.dataRows.value ?? []);

    // Per-column filters. Skipped entirely when the consumer owns filtering: the
    // rows already are the filtered set, and re-filtering them locally would
    // narrow the current page a second time.
    if (!this.isServerFiltered) {
      for (const col of this.dataSource.columns) {
        const filterValue = this.columnFilters[col.key];
        if (!col.filterable || !isFilterValueActive(filterValue)) continue;
        items = items.filter(row => matchesColumnFilter(col, row, filterValue as ColumnFilterValue));
      }
    }

    items = this.applySorting(items);

    this.filteredItems = items;
    this.applyPagination();

    if (searchForItems) {
      this.loadMoreRows();
    }
  }

  /**
   * Re-evaluate on a window resize too. The ResizeObserver covers every change to
   * the table's own box, but {@link isMobileViewport} reads the window, which can
   * change without the table's width following it (a fixed-width table, a modal
   * pinned to a max width).
   */
  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.onHostResize();
  }

  /** Re-evaluate responsive page size and filter layout when the table is resized. */
  private onHostResize(): void {
    // Pixel widths captured for the old box are meaningless in the new one.
    this.unpinColumnWidths();
    this.applyResponsivePageSize(true);
    this.updateFilterLayout(true);
  }

  /**
   * Captures the current, automatically-derived width of every visible column and
   * pins it, which flips the table to `table-fixed` on the next render.
   *
   * Runs only with real rows on screen: measuring the loading skeletons would pin
   * the placeholder bars' widths rather than the data's. Hidden columns
   * ({@link ColumnBase.hiddenBelow}) measure 0 and are skipped, so they are free to
   * size themselves if a resize later reveals them.
   *
   * The **widest** column is measured but deliberately left unpinned, so it absorbs
   * whatever space the pinned ones leave over. Pinning every column instead makes the
   * widths sum to slightly more than the container — `border-collapse` shares borders
   * between neighbours, so rounding each cell's measured width over-counts them — and
   * the table then overflows into a spurious horizontal scrollbar. Leaving one column
   * elastic also means a later resize squeezes the widest column first instead of
   * clipping every column equally.
   */
  private pinColumnWidths(): void {
    const headerCells = this.host.nativeElement.querySelectorAll('thead tr:first-child th[data-column-key]');
    const measured: { key: string; width: number }[] = [];
    for (const cell of Array.from(headerCells) as HTMLElement[]) {
      const key = cell.dataset['columnKey'];
      const width = cell.getBoundingClientRect().width;
      // A width of 0 means the column is hidden at this container width.
      if (!key || width <= 0) continue;
      measured.push({key, width});
    }
    if (measured.length === 0) return;

    const widest = measured.reduce((a, b) => (b.width > a.width ? b : a));
    const pinned = new Map<string, string>();
    for (const {key, width} of measured) {
      if (key === widest.key) continue;
      // Up, plus a pixel: rounding 87.4 down to 87 left the content 0.4px too wide for its
      // own column, so a header that fitted grew a stray "…" and a badge was clipped.
      pinned.set(key, `${Math.ceil(width) + 1}px`);
    }

    this.pinnedWidths = pinned;
    this.widthsPinned = true;
    // Pinning changes row heights: cells stop wrapping and start truncating, so a
    // full page becomes shorter than it was during the automatic pass. The reserved
    // full-page floor was measured against those taller rows and would otherwise
    // hold the body open, leaving dead space between the last row and the paginator.
    this.invalidatePageHeight();
    this.cdr.markForCheck();
  }

  /**
   * Drops the pinned widths so the next render with rows re-measures them. Called
   * when the table is resized: the old pixel widths were shares of a box that no
   * longer exists, and a resize is also what makes `hiddenBelow` columns come and
   * go, changing which columns need a share at all.
   */
  private unpinColumnWidths(): void {
    if (!this.widthsPinned) return;
    this.pinnedWidths = new Map();
    this.widthsPinned = false;
    // The window:resize listener marks the view for us; a container-only resize arrives
    // through the ResizeObserver, which does not.
    this.cdr.markForCheck();
    // Row heights are about to change back; the floor measured for the pinned
    // layout does not describe the automatic one.
    this.invalidatePageHeight();
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

  // ── Row actions ──

  /** The actions visible for a given row — those whose `hidden(row)` is not true. Shared by the wide table's buttons, the detail sheet and a modal's ⋯ menu. */
  visibleRowActions(column: ColumnDefinition<T>, row: T): MnTableRowAction<T>[] {
    return (column.actions ?? []).filter(action => !(action.hidden?.(row) ?? false));
  }

  /**
   * The inline buttons for a row, in column order: every visible action, plus a placeholder
   * where a hidden action has {@link MnTableRowAction.keepSlot} so the buttons after it keep
   * their column. The ⋯ menu and the collapse rule still read {@link visibleRowActions}.
   */
  inlineRowActions(
    column: ColumnDefinition<T>,
    row: T,
  ): { action: MnTableRowAction<T>; placeholder: boolean }[] {
    return (column.actions ?? [])
      .map(action => ({ action, placeholder: action.hidden?.(row) ?? false }))
      .filter(slot => !slot.placeholder || !!slot.action.keepSlot);
  }

  /** Whether a row has any visible actions at all; when false its cell is left empty. */
  hasRowActions(column: ColumnDefinition<T>, row: T): boolean {
    return this.visibleRowActions(column, row).length > 0;
  }

  /**
   * Resolves a {@link MnRowValue}: either the fixed value, or the accessor applied to
   * the row. Every per-row presentation field goes through here so the fixed and derived
   * forms can never drift apart.
   */
  private resolveRowValue<V>(value: MnRowValue<T, V> | undefined, row: T): V | undefined {
    return typeof value === 'function' ? (value as (row: T) => V)(row) : value;
  }

  /** The resolved label for an inline action button (translation key wins once resolved). */
  rowActionLabel(action: MnTableRowAction<T>, row: T): string {
    const labelKey = this.resolveRowValue(action.labelKey, row);
    if (labelKey) return this.lang.t(labelKey);
    return this.resolveRowValue(action.label, row) ?? '';
  }

  /** The resolved leading icon for an action on a given row, if it has one. */
  rowActionIcon(action: MnTableRowAction<T>, row: T): MnActionIcon | undefined {
    return this.resolveRowValue(action.icon, row);
  }

  /** Whether an inline action button should render its icon. */
  showActionIcon(column: ColumnDefinition<T>, action: MnTableRowAction<T>, row: T): boolean {
    return (column.actionsInline ?? 'both') !== 'label' && !!this.rowActionIcon(action, row);
  }

  /**
   * Whether an inline action button should render its text label. In `'icon'` mode the
   * label is hidden — unless the action has no icon, in which case it is shown anyway so
   * the button is never blank.
   */
  showActionLabel(column: ColumnDefinition<T>, action: MnTableRowAction<T>, row: T): boolean {
    if ((column.actionsInline ?? 'both') === 'icon') return !this.rowActionIcon(action, row);
    return true;
  }

  /** Whether an action is disabled for the given row. */
  isRowActionDisabled(action: MnTableRowAction<T>, row: T): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  /**
   * The effective colour for an action, used identically by the inline button and the
   * collapsed ⋯-menu item so the two never diverge: an explicit `color`, else `'danger'`
   * for a destructive action, else the default `'primary'`.
   */
  rowActionColor(action: MnTableRowAction<T>, row: T): MnDropdownActionColor {
    return this.resolveRowValue(action.color, row) ?? (action.danger ? 'danger' : 'primary');
  }

  /** Invokes an action for a row. */
  runRowAction(action: MnTableRowAction<T>, row: T): void {
    action.run(row);
  }

  /** A stable, unique element id for a row's actions dropdown (aria wiring). */
  actionsDropdownId(column: ColumnDefinition<T>, row: T): string {
    return `mn-table-actions-${column.key}-${this.dataSource.getID(row)}`;
  }

  /** Maps a row's visible actions to mn-dropdown commands, binding the row into each. */
  rowDropdownActions(column: ColumnDefinition<T>, row: T): MnDropdownAction[] {
    return this.visibleRowActions(column, row).map(action => ({
      // Per-row values are resolved here, but `labelKey` stays a *key* so the dropdown
      // keeps re-translating it on a locale change rather than freezing today's text.
      label: this.resolveRowValue(action.label, row),
      labelKey: this.resolveRowValue(action.labelKey, row),
      icon: this.rowActionIcon(action, row),
      color: this.rowActionColor(action, row),
      danger: action.danger,
      disabled: this.isRowActionDisabled(action, row),
      run: () => action.run(row),
    }));
  }

  trackByKey = (_index: number, column: ColumnDefinition<T>): string => {
    return column.key;
  };

  // ── Table CSS classes ──

  /** True when the table is narrower than the filter-collapse breakpoint. */
  private isFilterViewport(): boolean {
    return this.measuredWidth() < MnTable.FILTER_COLLAPSE_WIDTH;
  }

  /**
   * True when the **window** is below the `md` (768px) breakpoint.
   *
   * Deliberately viewport-based, unlike {@link isFilterViewport}: the forced
   * mobile page size exists to keep a phone screen scrollable, and it is paired
   * with the rows-per-page selector that mn-collection-pagination hides at the
   * same viewport breakpoint. Measuring the table's own width instead would let
   * the two disagree — a 700px table on a desktop would be pinned to the mobile
   * row count while still offering the selector that overrides it.
   */
  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  /**
   * The table's own rendered width, which every responsive decision is made
   * against — the same width the `@container` queries in the template use, so
   * the TS and CSS halves of the responsive layout can never disagree.
   *
   * Falls back to the window width before the host has been laid out (and in
   * SSR), which is the closest available approximation at that point.
   * @returns The width in CSS pixels.
   */
  private measuredWidth(): number {
    const width = this.host.nativeElement.getBoundingClientRect().width;
    if (width > 0) return width;
    return typeof window === 'undefined' ? Number.MAX_SAFE_INTEGER : window.innerWidth;
  }

  /**
   * Applies the breakpoint-appropriate page size: capped at {@link MOBILE_PAGE_SIZE}
   * below `md`, the desktop size at/above it. When the size actually changes, client-side tables
   * re-slice locally and server-side tables ask the consumer to refetch, so the
   * rendered rows update in every pagination mode (used at init and on window resize).
   */
  private applyResponsivePageSize(reflow: boolean): void {
    // A phone list grown by "Load more" keeps its size while it stays a phone list: a phone fires
    // resize whenever its address bar slides, and each one would throw the list back to 10 rows.
    if (this.phoneLoadStep) {
      if (this.isFilterViewport()) return;
      this.phoneLoadStep = 0;
    }
    const target = this.isMobileViewport()
      ? Math.min(this.desktopPageSize, MnTable.MOBILE_PAGE_SIZE)
      : this.desktopPageSize;
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

  get totalColumnCount(): number {
    let count = this.dataSource.columns.length;
    if (this.hasSelection) count++;
    return count;
  }

  // ── Skeleton ──

  /**
   * Hands the active filters to the consumer. Locks the body height first so the
   * skeleton swap during the refetch can't collapse the layout, matching
   * {@link goToPage} and {@link onSearch}.
   */
  private emitServerFilters(): void {
    this.lockBodyHeight();
    this.dataSource.onColumnFilterChange?.(this.activeColumnFilters);
  }

  /** Resets every filterable column to its type's empty value. */
  private seedFilterValues(): void {
    for (const col of this.dataSource.columns) {
      if (col.filterable) {
        this.columnFilters[col.key] = emptyFilterValue(this.filterTypeOf(col));
      }
    }
  }

  // ── Filtering & sorting ──

  /**
   * Resolves the selection-summary labels from their translation keys. Resolved
   * without params so the `{{count}}` / `{{label}}` placeholders survive for the
   * getters to fill in per render.
   */
  private resolveSelectionSummaryKeys(): void {
    const labels = this.dataSource.selectionSummaryLabels;
    if (!labels) return;
    if (labels.titleKey) labels.title = this.lang.t(labels.titleKey);
    if (labels.clearAllKey) labels.clearAll = this.lang.t(labels.clearAllKey);
    if (labels.removeKey) labels.remove = this.lang.t(labels.removeKey);
    if (labels.showMoreKey) labels.showMore = this.lang.t(labels.showMoreKey);
    if (labels.showLessKey) labels.showLess = this.lang.t(labels.showLessKey);
  }

  /** Resolves the range / boolean filter control labels from their translation keys. */
  private resolveFilterLabelKeys(): void {
    const labels = this.dataSource.filterLabels;
    if (!labels) return;
    const pairs = [
      ['anyKey', 'any'], ['yesKey', 'yes'], ['noKey', 'no'], ['selectedKey', 'selected'],
    ] as const;
    for (const [keyProp, labelProp] of pairs) {
      const key = labels[keyProp];
      if (key) labels[labelProp] = this.lang.t(key);
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

  /**
   * What an unfiltered select column reads: the column's own placeholder, else "All". It is both
   * the first option and the select's placeholder, because mn-select shows its placeholder for an
   * empty value (right for a form field, which must stay invalid until chosen), so without it an
   * unfiltered column read the select's generic "Select..." instead of "All".
   * @param column The filtered column.
   * @returns The label.
   */
  filterAllLabel(column: ColumnDefinition<T>): string {
    return column.filterPlaceholder ?? this.resolveLabel(undefined, 'mnCollection.filterAll', 'All');
  }

  /** Filter options formatted for mn-select for a given column. */
  getFilterSelectOptions(column: ColumnDefinition<T>): MnSelectOption<string>[] {
    return [
      {label: this.filterAllLabel(column), value: ''},
      ...(column.filterOptions ?? []).map(opt => ({label: opt.label, value: String(opt.value)})),
    ];
  }

  /**
   * Accessible label for a tag's remove button.
   * @param row The row the tag stands for.
   * @returns The label, naming the row so screen readers announce which one goes.
   */
  selectionRemoveLabel(row: T): string {
    const labels = this.dataSource.selectionSummaryLabels;
    const template = this.resolveLabel(labels?.removeKey, 'mnCollection.removeSelected', labels?.remove ?? 'Remove {{label}}');
    return template.replace('{{label}}', this.selectionLabelFor(row));
  }
}
