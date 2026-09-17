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
import {FormsModule} from '@angular/forms';
import {LucideDynamicIcon} from '@lucide/angular';
import {ListDataSource} from './mn-list.types';
import {MnCheckbox} from 'mn-angular-lib/forms';
import {MnInputField} from 'mn-angular-lib/forms';
import {MnSkeleton, MnSkeletonProps} from 'mn-angular-lib/button';
import {MnCollectionPagination, MnSelectableCollectionBase} from '../mn-collection';

/** Default skeleton lines reproducing the previous two-bar placeholder. */
const DEFAULT_LIST_SKELETON_LINES: Partial<MnSkeletonProps>[] = [
  {shape: 'text', width: '75%'},
  {shape: 'text', width: '50%', height: '0.75rem'},
];

@Component({
  selector: 'mn-list',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, FormsModule, MnCheckbox, MnInputField, MnSkeleton, MnCollectionPagination, LucideDynamicIcon],
  templateUrl: './mn-list.component.html',
  styleUrl: './mn-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnList<T = unknown>
  extends MnSelectableCollectionBase<T, ListDataSource<T>> {
  @Output() itemClick = new EventEmitter<T>();

  protected override readonly componentName = 'MnList';

  /** Skeleton lines rendered for each placeholder item, falling back to the default two-bar layout. */
  get skeletonLines(): Partial<MnSkeletonProps>[] {
    const skeleton = this.dataSource.skeleton;
    if (skeleton && !this.isTemplateRef(skeleton)) {
      return skeleton.lines;
    }
    return DEFAULT_LIST_SKELETON_LINES;
  }

  // ── Item interaction ──

  onItemClick(item: T): void {
    this.dataSource.onItemClick?.(item);
    this.itemClick.emit(item);
  }

  /**
   * Keyboard activation of a clickable item: Enter and Space open it, as they would a button.
   * Handled on keydown so Space does not scroll the page first, and only when the item itself has
   * focus, so a checkbox or button inside the item keeps its own keys.
   * @param event - The keydown on the item.
   * @param item - The item the key was pressed on.
   */
  onItemKeydown(event: KeyboardEvent, item: T): void {
    if (!this.dataSource.onItemClick || event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.onItemClick(item);
  }

  // ── Skeleton ──

  /**
   * The toolbar template the base class watches for identity changes. Prefers the
   * left slot, then the right, then the deprecated `toolbarTemplate`, so a list
   * using any single slot still re-renders when that template is swapped.
   */
  protected get trackedToolbarTemplate(): TemplateRef<unknown> | undefined {
    return (
      this.dataSource?.toolbarLeftTemplate ??
      this.dataSource?.toolbarRightTemplate ??
      this.dataSource?.toolbarTemplate
    );
  }

  @ViewChild('collectionBody') protected collectionBody?: ElementRef<HTMLElement>;

  // ── Filtering ──

  protected applyFilter(searchForItems: boolean): void {
    this.filteredItems = this.applySearchFilter(this.dataSource.dataRows.value);
    this.applyPagination();

    if (searchForItems) {
      this.loadMoreRows();
    }
  }

  /** Accessible name for the scrollable list region. */
  get listRegionLabel(): string {
    return this.resolveLabel(undefined, 'mnCollection.dataList', 'Data list');
  }

  /** Label on the header checkbox that selects or clears every visible row. */
  get selectAllLabel(): string {
    return this.resolveLabel(undefined, 'mnCollection.selectAll', 'Select all');
  }
}
