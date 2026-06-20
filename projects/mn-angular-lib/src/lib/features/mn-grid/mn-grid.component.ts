import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {GridDataSource} from './mn-grid.types';
import {MnSkeleton, MnSkeletonProps} from '../mn-skeleton';
import {MnInputField} from '../mn-input-field';
import {MnCollectionBase, MnCollectionPagination} from '../mn-collection';

/** Default card skeleton: an image block plus two text bars. */
const DEFAULT_GRID_SKELETON_LINES: Partial<MnSkeletonProps>[] = [
  {shape: 'rectangle', width: '100%', height: '8rem'},
  {shape: 'text', width: '75%'},
  {shape: 'text', width: '50%', height: '0.75rem'},
];

/**
 * Responsive card-grid component. Shares the collection chrome (search, every
 * pagination mode, loading skeleton, empty state, toolbar, i18n) with
 * {@link import('../mn-list').MnList} and {@link import('../mn-table').MnTable}
 * via {@link MnCollectionBase}, and lays items out as cards instead of rows.
 * Selection is intentionally not supported.
 */
@Component({
  selector: 'mn-grid',
  standalone: true,
  imports: [NgTemplateOutlet, FormsModule, MnSkeleton, MnInputField, MnCollectionPagination],
  templateUrl: './mn-grid.component.html',
  styleUrl: './mn-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnGrid<T = unknown> extends MnCollectionBase<T, GridDataSource<T>> {
  @Output() itemClick = new EventEmitter<T>();

  protected override readonly componentName = 'MnGrid';

  /** Whether the grid uses auto-fit (minCardWidth) instead of explicit columns. */
  get isAutoLayout(): boolean {
    return !!this.dataSource.layout?.minCardWidth;
  }

  // ── Layout ──

  /** Skeleton lines for the default/lines placeholder; null when a custom template is used. */
  get skeletonLines(): Partial<MnSkeletonProps>[] {
    const skeleton = this.dataSource.skeleton;
    if (skeleton && !this.isTemplateRef(skeleton)) {
      return skeleton.lines;
    }
    return DEFAULT_GRID_SKELETON_LINES;
  }

  // ── Item interaction ──

  protected get trackedToolbarTemplate(): TemplateRef<unknown> | undefined {
    return this.dataSource?.toolbarTemplate;
  }

  @ViewChild('collectionBody') protected collectionBody?: ElementRef<HTMLElement>;

  // ── Skeleton ──

  onItemClick(item: T): void {
    this.dataSource.onItemClick?.(item);
    this.itemClick.emit(item);
  }

  // ── Filtering ──

  protected applyFilter(searchForItems: boolean): void {
    let items = this.applySearchFilter(this.dataSource.dataRows.value ?? []);

    // Preview cap: show only the first `maxItems` cards (pager stays hidden).
    const maxItems = this.dataSource.layout?.maxItems;
    if (maxItems != null) {
      items = items.slice(0, maxItems);
    }

    this.filteredItems = items;
    this.applyPagination();

    if (searchForItems) {
      this.loadMoreRows();
    }
  }
}
