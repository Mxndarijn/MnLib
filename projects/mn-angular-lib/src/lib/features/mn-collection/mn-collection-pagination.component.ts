import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MnButton} from '../mn-button';
import {MnSelect, MnSelectOption} from '../mn-select';
import {MnCollectionLabels} from './mn-collection.types';

/**
 * Presentational pagination footer shared by every MnLib collection component
 * (table, list, grid): the load-more button, the page-size selector and the
 * page navigator. It holds no state — the host component owns pagination state
 * (via {@link import('./mn-collection-base.directive').MnCollectionBase}) and
 * reacts to the outputs.
 */
@Component({
  selector: 'mn-collection-pagination',
  standalone: true,
  imports: [MnButton, MnSelect, FormsModule],
  templateUrl: './mn-collection-pagination.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnCollectionPagination {
  /** Prefix for the page-size select's id, keeping it unique per host. */
  @Input() idPrefix = 'mn-collection';

  @Input() isPaginated = false;
  @Input() isServerPaginated = false;
  @Input() showLoadMore = false;
  @Input() loadingMoreRows = false;

  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() totalPages = 1;
  @Input() totalItemCount = 0;
  @Input() visiblePages: number[] = [];
  @Input() pageSizeSelectOptions: MnSelectOption<number>[] = [];
  @Input() labels?: MnCollectionLabels;

  @Output() loadMore = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get showPagination(): boolean {
    return this.isPaginated && (this.totalPages > 1 || this.isServerPaginated);
  }
}
