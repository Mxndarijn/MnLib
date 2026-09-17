import {Directive, EventEmitter, Output} from '@angular/core';
import {MnCollectionBase} from './mn-collection-base.directive';
import {MnSelectableCollectionDataSource} from './mn-collection.types';

/**
 * Extends {@link MnCollectionBase} with single/multi row selection, shared by
 * components that support it (table, list). Grid extends the plain base instead.
 */
@Directive()
export abstract class MnSelectableCollectionBase<
  T,
  DS extends MnSelectableCollectionDataSource<T>,
> extends MnCollectionBase<T, DS> {
  @Output() selectionChange = new EventEmitter<T[]>();

  selectedIds = new Set<string>();

  /** Whether the summary is currently showing every tag rather than the first few. */
  selectionSummaryExpanded = false;

  get allSelected(): boolean {
    return this.filteredItems.length > 0 && this.selectedIds.size === this.filteredItems.length;
  }

  /**
   * The row behind every selected id, kept so the selection survives the rows
   * themselves going away.
   *
   * {@link selectedIds} alone is enough to tick a checkbox, because that only ever
   * asks about a row already on screen. The summary asks the opposite question —
   * "what is selected, including what isn't on this page?" — and a server-paginated
   * collection has long since discarded those rows. Rows are captured as they are
   * selected and backfilled from {@link MnSelectableCollectionDataSource.initialSelectedRows}
   * and from each batch that loads.
   */
  protected selectedRowsById = new Map<string, T>();
  /**
   * Whether a seeded initial selection still has to be announced, because none of
   * its ids matched a loaded row yet. See {@link beforeInitialFilter}.
   */
  private pendingInitialEmit = false;

  /**
   * Every selected row, in selection order, for the summary. Ids whose row was
   * never seen are skipped rather than rendered as a bare id.
   */
  get selectedSummaryRows(): T[] {
    const rows: T[] = [];
    for (const id of this.selectedIds) {
      const row = this.selectedRowsById.get(id);
      if (row !== undefined) rows.push(row);
    }
    return rows;
  }

  /** Whether the selection summary should render. */
  get showSelectionSummary(): boolean {
    return !!this.dataSource.selectionSummary && this.hasSelection && this.selectedIds.size > 0;
  }

  /** How many tags to show before collapsing the remainder. */
  get selectionSummaryLimit(): number {
    return this.dataSource.selectionSummaryLimit ?? this.defaultSelectionSummaryLimit;
  }

  /**
   * Tag count the summary collapses at when the data source names no limit.
   *
   * Subclasses that know their own width narrow this: the same eight tags that
   * read as a compact header on a wide table become seven stacked lines in a phone
   * sheet, pushing the rows they describe off screen. Overridden by
   * {@link MnCollectionDataSource.selectionSummaryLimit}.
   */
  // Deliberately an accessor, not a readonly field: MnTable overrides it with a
  // width-dependent getter, and TypeScript cannot override a property with one.
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  protected get defaultSelectionSummaryLimit(): number {
    return 8;
  }

  /**
   * The tags to render: the first {@link selectionSummaryLimit} rows, or all of them
   * once expanded. Keeps a large selection from turning the header into the page.
   */
  get visibleSelectionRows(): T[] {
    const rows = this.selectedSummaryRows;
    return this.selectionSummaryExpanded ? rows : rows.slice(0, this.selectionSummaryLimit);
  }

  /** How many selected rows are collapsed out of view; 0 when all are shown. */
  get hiddenSelectionCount(): number {
    if (this.selectionSummaryExpanded) return 0;
    return Math.max(0, this.selectedSummaryRows.length - this.selectionSummaryLimit);
  }

  /** Expands or re-collapses the summary's tag list. */
  toggleSelectionSummary(): void {
    this.selectionSummaryExpanded = !this.selectionSummaryExpanded;
    this.cdr.markForCheck();
  }

  /**
   * The label for a row in the summary: the consumer's {@link
   * MnSelectableCollectionDataSource.selectionLabel}, else the first column that
   * renders a plain string, else the row's id.
   * @param row The selected row.
   * @returns The text to show on the row's tag.
   */
  selectionLabelFor(row: T): string {
    const custom = this.dataSource.selectionLabel;
    if (custom) return custom(row);
    return this.defaultSelectionLabel(row) ?? this.dataSource.getID(row);
  }

  /** Removes one row from the selection, from its tag in the summary. */
  removeSelection(row: T): void {
    const id = this.dataSource.getID(row);
    if (!this.selectedIds.delete(id)) return;
    this.selectedRowsById.delete(id);
    this.emitSelection();
    this.cdr.markForCheck();
  }

  get hasSelection(): boolean {
    return (this.dataSource.selectionMode ?? 'none') !== 'none';
  }

  get isMultiSelect(): boolean {
    return this.dataSource.selectionMode === 'multi';
  }

  isSelected(item: T): boolean {
    return this.selectedIds.has(this.dataSource.getID(item));
  }

  /** Clears the whole selection, from the summary's clear-all action. */
  clearSelection(): void {
    if (this.selectedIds.size === 0) return;
    this.selectedIds.clear();
    this.selectedRowsById.clear();
    this.emitSelection();
    this.cdr.markForCheck();
  }

  toggle(item: T): void {
    const id = this.dataSource.getID(item);
    const mode = this.dataSource.selectionMode ?? 'none';

    if (mode === 'single') {
      this.selectedIds.clear();
      this.selectedRowsById.clear();
      this.selectedIds.add(id);
      this.selectedRowsById.set(id, item);
    } else if (mode === 'multi') {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id);
        this.selectedRowsById.delete(id);
      } else {
        this.selectedIds.add(id);
        this.selectedRowsById.set(id, item);
      }
    }

    this.emitSelection();
  }

  toggleAll(): void {
    if (this.selectedIds.size === this.filteredItems.length) {
      this.selectedIds.clear();
      this.selectedRowsById.clear();
    } else {
      this.filteredItems.forEach(item => {
        const id = this.dataSource.getID(item);
        this.selectedIds.add(id);
        this.selectedRowsById.set(id, item);
      });
    }
    this.emitSelection();
  }

  /**
   * Fallback label used when the data source declares no `selectionLabel`.
   * Subclasses that know how to render a row as text (a table knows its columns)
   * override this; the base has nothing to go on.
   * @returns The label, or null when none can be derived.
   */
  protected defaultSelectionLabel(_row: T): string | null {
    return null;
  }

  /** Seeds selection from `initialSelectedIds` before the first filter pass. */
  protected override beforeInitialFilter(): void {
    super.beforeInitialFilter();
    if (!this.dataSource.initialSelectedIds?.length) return;

    for (const id of this.dataSource.initialSelectedIds) {
      this.selectedIds.add(id);
    }
    for (const row of this.dataSource.initialSelectedRows ?? []) {
      this.selectedRowsById.set(this.dataSource.getID(row), row);
    }
    this.captureSelectedRows();

    // The rows are commonly still in flight at this point (any server fetch), and
    // then no id resolves to a row yet. Emitting that would announce "nothing is
    // selected" and let the consumer — a form control bound to this table, say —
    // overwrite the very value it just seeded us with. Defer instead, and announce
    // it from {@link onRowsChanged} once the rows actually arrive.
    if (this.resolveSelectedRows().length === 0) {
      this.pendingInitialEmit = true;
      return;
    }
    this.emitSelection();
  }

  /** Announces a deferred initial selection as soon as its rows are loaded. */
  protected override onRowsChanged(): void {
    super.onRowsChanged();
    // A newly loaded page may hold rows for ids selected before it arrived.
    this.captureSelectedRows();
    if (!this.pendingInitialEmit || this.resolveSelectedRows().length === 0) return;
    this.pendingInitialEmit = false;
    this.emitSelection();
  }

  protected emitSelection(): void {
    // A real user interaction supersedes any deferred initial announcement.
    this.pendingInitialEmit = false;
    const rows = this.resolveSelectedRows();
    this.dataSource.selectedRows?.next(rows);
    this.selectionChange.emit(rows);
  }

  /** Records the row object for every loaded row that is currently selected. */
  private captureSelectedRows(): void {
    for (const row of this.dataSource.dataRows.value ?? []) {
      const id = this.dataSource.getID(row);
      if (this.selectedIds.has(id)) this.selectedRowsById.set(id, row);
    }
  }

  /** The currently loaded rows whose id is selected. */
  private resolveSelectedRows(): T[] {
    return (this.dataSource.dataRows.value ?? [])
      .filter(r => this.selectedIds.has(this.dataSource.getID(r)));
  }
}
