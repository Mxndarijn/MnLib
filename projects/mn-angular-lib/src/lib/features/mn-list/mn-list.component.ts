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
import {ListDataSource} from './mn-list.types';
import {MnCheckbox} from '../mn-checkbox';
import {MnInputField} from '../mn-input-field';
import {MnSkeleton, MnSkeletonProps} from '../mn-skeleton';
import {MnCollectionPagination, MnSelectableCollectionBase} from '../mn-collection';

/** Default skeleton lines reproducing the previous two-bar placeholder. */
const DEFAULT_LIST_SKELETON_LINES: Partial<MnSkeletonProps>[] = [
  {shape: 'text', width: '75%'},
  {shape: 'text', width: '50%', height: '0.75rem'},
];

@Component({
  selector: 'mn-list',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, FormsModule, MnCheckbox, MnInputField, MnSkeleton, MnCollectionPagination],
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

  // ── Skeleton ──

  protected get trackedToolbarTemplate(): TemplateRef<unknown> | undefined {
    return this.dataSource?.toolbarTemplate;
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
}
