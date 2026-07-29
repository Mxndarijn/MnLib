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
  DateRangeFilterValue,
  MnColumnFilter,
  NumberRangeFilterValue,
  SortState,
  TableDataSource,
} from './mn-table.types';
import {emptyFilterValue, isFilterValueActive, matchesColumnFilter} from './mn-table-filter.util';
import {MnSkeleton, MnSkeletonProps} from '../mn-skeleton';
import {MnSelect, MnSelectOption} from '../mn-select';
import {MnMultiSelect, MnMultiSelectOption} from '../mn-multi-select';
import {MnDatetime} from '../mn-datetime';
import {MnCheckbox} from '../mn-checkbox';
import {MnHiddenBelowDirective} from './mn-hidden-below.directive';
import {MnShowAboveDirective} from './mn-show-above.directive';
import {MnShowBelowDirective} from './mn-show-below.directive';
import {MnInputField} from '../mn-input-field';
import {FormsModule} from '@angular/forms';
import {MnCollectionPagination, MnSelectableCollectionBase} from '../mn-collection';
import {MnButton} from '../mn-button';
import {LucideDynamicIcon, LucideFilter, LucideFunnel, LucideX} from '@lucide/angular';

/** Which bound of a range filter an input edits. */
type RangeBound = 'min' | 'max' | 'from' | 'to';

@Component({
  selector: 'mn-table',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, MnCheckbox, MnHiddenBelowDirective, MnShowAboveDirective, MnShowBelowDirective, MnInputField, MnSelect, MnMultiSelect, MnDatetime, MnSkeleton, FormsModule, MnCollectionPagination, MnButton, LucideFilter, LucideX, LucideFunnel, LucideDynamicIcon],
  templateUrl: './mn-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block-level so the host has a definite width for the @container chrome inside it.
  host: {class: 'block'},
})
export class MnTable<T = object>
  extends MnSelectableCollectionBase<T, TableDataSource<T>> {
  @Output() sortChange = new EventEmitter<SortState | null>();
  @Output() rowClick = new EventEmitter<T>();

  currentSort: SortState | null = null;

  /** Per-column filter values keyed by column key. */
  columnFilters: ColumnFilterState = {};

  /** Filter types compact enough to render directly inside the header cell. */
  private static readonly INLINE_FILTER_TYPES: ColumnFilterType[] = ['text', 'select', 'boolean'];
  /** Width (px) of the filter popover, mirrored from its `w-64` class for clamping. */
  private static readonly POPOVER_WIDTH = 256;

  /** Viewport width (px) below which the inline filter row collapses into a panel. */
  private static readonly FILTER_COLLAPSE_WIDTH = 640;
  /**
   * Key of the column whose filter popover is open, or `null` when none is.
   * Only the rich filter types ({@link isPopoverFilter}) use a popover.
   */
  protected openFilterKey: string | null = null;
  /** Bounds rendered by a number-range filter, in input order. */
  protected readonly numberBounds: RangeBound[] = ['min', 'max'];

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

  // ── Column Filters ──
  /** Bounds rendered by a date-range filter, in input order. */
  protected readonly dateBounds: RangeBound[] = ['from', 'to'];
  /** Viewport coordinates of the open filter popover. */
  protected popoverPosition = {top: 0, left: 0};
  /** Debounces server-side text filters so typing doesn't fire a request per keystroke. */
  private readonly filterDebounce = new Subject<void>();
  /** The open filter popover, used to tell inside clicks from outside ones. */
  @ViewChild('filterPopover') private filterPopover?: ElementRef<HTMLElement>;

  /**
   * Most rows shown per page on mobile (< md). A **cap**, not an override: a data
   * source asking for fewer rows keeps its own size. Raising a small page size on
   * a phone is the opposite of what it is for — it pushes the paginator below the
   * fold, which is most damaging inside a modal, where the sheet is already short
   * and its footer is pinned over the bottom of the table.
   */
  private static readonly MOBILE_PAGE_SIZE = 10;
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

  /** Updates one bound of a range filter, leaving the other side untouched. */
  onRangeFilter(column: ColumnDefinition<T>, bound: RangeBound, raw: string): void {
    const current = {...(this.columnFilters[column.key] as object ?? {})} as NumberRangeFilterValue & DateRangeFilterValue;
    if (bound === 'min' || bound === 'max') {
      const parsed = Number(raw);
      // An emptied input clears that bound rather than pinning it to 0.
      if (raw === '' || Number.isNaN(parsed)) delete current[bound];
      else current[bound] = parsed;
    } else {
      if (raw === '') delete current[bound];
      else current[bound] = raw;
    }
    this.onColumnFilter(column, current);
  }

  /** Updates a tri-state boolean filter from its select ('' = any). */
  onBooleanFilter(column: ColumnDefinition<T>, raw: string): void {
    this.onColumnFilter(column, raw === '' ? '' : raw === 'true');
  }

  /** The effective filter type of a column, defaulting to text. */
  filterTypeOf(column: ColumnDefinition<T>): ColumnFilterType {
    return column.filterType ?? 'text';
  }

  /** Whether a column's filter renders inline in the header cell (vs. in a popover). */
  isInlineFilter(column: ColumnDefinition<T>): boolean {
    return MnTable.INLINE_FILTER_TYPES.includes(this.filterTypeOf(column));
  }

  /** Whether a column's filter is rich enough to need the popover panel. */
  isPopoverFilter(column: ColumnDefinition<T>): boolean {
    return !!column.filterable && !this.isInlineFilter(column);
  }

  /** Whether a specific column's filter currently narrows the rows. */
  isColumnFilterActive(column: ColumnDefinition<T>): boolean {
    return isFilterValueActive(this.columnFilters[column.key]);
  }

  /** The column whose filter popover is open, or `null`. */
  openFilterColumn(): ColumnDefinition<T> | null {
    if (this.openFilterKey === null) return null;
    return this.dataSource.columns.find(col => col.key === this.openFilterKey) ?? null;
  }

  /**
   * Opens/closes a column's filter popover, closing any other that was open, and
   * anchors it under the trigger. The popover is positioned `fixed` from the
   * trigger's viewport rect because it renders outside the table's
   * `overflow-x-auto` wrapper, which would otherwise clip it.
   */
  toggleFilterPopover(column: ColumnDefinition<T>, event: Event): void {
    if (this.openFilterKey === column.key) {
      this.openFilterKey = null;
      return;
    }
    const trigger = event.currentTarget as HTMLElement | null;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const maxLeft = window.innerWidth - MnTable.POPOVER_WIDTH - 8;
      this.popoverPosition = {top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, maxLeft))};
    }
    this.openFilterKey = column.key;
  }

  /** Resets a single column's filter (from its popover) and re-applies filtering. */
  clearColumnFilter(column: ColumnDefinition<T>): void {
    this.onColumnFilter(column, emptyFilterValue(this.filterTypeOf(column)));
  }

  /** Closes the filter popover, if one is open. */
  closeFilterPopover(): void {
    if (this.openFilterKey === null) return;
    this.openFilterKey = null;
    this.cdr.markForCheck();
  }

  /** Filter options formatted for mn-multi-select for a given column. */
  getFilterMultiSelectOptions(column: ColumnDefinition<T>): MnMultiSelectOption<string>[] {
    return (column.filterOptions ?? []).map(opt => ({label: opt.label, value: String(opt.value)}));
  }

  /** Any / Yes / No options for a boolean column filter. */
  getBooleanFilterOptions(column: ColumnDefinition<T>): MnSelectOption<string>[] {
    const labels = this.dataSource.filterLabels;
    return [
      {label: column.filterPlaceholder ?? labels?.any ?? 'Any', value: ''},
      {label: labels?.yes ?? 'Yes', value: 'true'},
      {label: labels?.no ?? 'No', value: 'false'},
    ];
  }

  /** Filter options formatted for mn-select for a given column. */
  getFilterSelectOptions(column: ColumnDefinition<T>): MnSelectOption<string>[] {
    const placeholder = column.filterPlaceholder ?? 'All';
    return [
      {label: placeholder, value: ''},
      ...(column.filterOptions ?? []).map(opt => ({label: opt.label, value: String(opt.value)})),
    ];
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

  /** Current value of one bound of a range filter, as an input-ready string. */
  rangeFilterValue(column: ColumnDefinition<T>, bound: RangeBound): string {
    const value = this.columnFilters[column.key] as NumberRangeFilterValue & DateRangeFilterValue | undefined;
    const bounded = value?.[bound];
    return bounded === undefined || bounded === null ? '' : String(bounded);
  }

  /** Label for a range filter bound, falling back to the English default. */
  rangeBoundLabel(bound: RangeBound): string {
    const labels = this.dataSource.filterLabels;
    switch (bound) {
      case 'min':
        return labels?.min ?? 'Min';
      case 'max':
        return labels?.max ?? 'Max';
      case 'from':
        return labels?.from ?? 'From';
      case 'to':
        return labels?.to ?? 'To';
    }
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

  /**
   * Closes the filter popover when the click landed outside it. Membership is
   * tested against the popover element rather than stopping propagation inside
   * it, so the popover's own controls stay ordinary, focusable elements.
   */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.openFilterKey === null) return;
    const target = event.target as Node | null;
    if (target && this.filterPopover?.nativeElement.contains(target)) return;
    this.closeFilterPopover();
  }

  /** Whether any column has filtering enabled. */
  get hasColumnFilters(): boolean {
    return this.dataSource.columns.some(c => c.filterable);
  }

  /** Closes the filter popover on Escape. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeFilterPopover();
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
      if (this.layoutMode !== 'stable') return;
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
      pinned.set(key, `${Math.round(width)}px`);
    }

    this.pinnedWidths = pinned;
    this.widthsPinned = true;
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
    // The popover is anchored to a viewport rect that a resize invalidates.
    this.closeFilterPopover();
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
    }
    if (this.dataSource.filtersLabelKey) {
      this.dataSource.filtersLabel = this.lang.t(this.dataSource.filtersLabelKey);
    }
    if (this.dataSource.clearFiltersLabelKey) {
      this.dataSource.clearFiltersLabel = this.lang.t(this.dataSource.clearFiltersLabelKey);
    }
    this.resolveFilterLabelKeys();
  }

  /** Tracks the desktop page size when the user picks one (selector only shows at >= md). */
  override onPageSizeChange(newSize: number): void {
    this.desktopPageSize = newSize;
    super.onPageSizeChange(newSize);
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

  /** Resolves the range / boolean filter control labels from their translation keys. */
  private resolveFilterLabelKeys(): void {
    const labels = this.dataSource.filterLabels;
    if (!labels) return;
    const pairs = [
      ['minKey', 'min'], ['maxKey', 'max'], ['fromKey', 'from'], ['toKey', 'to'],
      ['anyKey', 'any'], ['yesKey', 'yes'], ['noKey', 'no'],
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
}
