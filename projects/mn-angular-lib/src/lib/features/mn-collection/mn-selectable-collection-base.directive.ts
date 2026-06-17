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

  get allSelected(): boolean {
    return this.filteredItems.length > 0 && this.selectedIds.size === this.filteredItems.length;
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

  toggle(item: T): void {
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

  /** Seeds selection from `initialSelectedIds` before the first filter pass. */
  protected override beforeInitialFilter(): void {
    super.beforeInitialFilter();
    if (this.dataSource.initialSelectedIds?.length) {
      for (const id of this.dataSource.initialSelectedIds) {
        this.selectedIds.add(id);
      }
      this.emitSelection();
    }
  }

  protected emitSelection(): void {
    const rows = (this.dataSource.dataRows.value ?? []).filter(r => this.selectedIds.has(this.dataSource.getID(r)));
    this.dataSource.selectedRows?.next(rows);
    this.selectionChange.emit(rows);
  }
}
