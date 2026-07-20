import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MnButton} from '../mn-button';
import {MnSelect, MnSelectOption} from '../mn-select';
import {MnCollectionLabels} from './mn-collection.types';

/** One position in the page-number strip. */
export type MnPageSlot = {
  /** Page to jump to, or `null` for an ellipsis gap. */
  page: number | null;
  /**
   * True for the first/last page anchors and the gaps beside them. These are
   * hidden below `md`, where the readout states the total and « » already jump
   * to either end — the strip would otherwise wrap.
   */
  anchor: boolean;
}

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

  /** First item number on the current page, 1-based. Zero when there is no data. */
  get rangeStart(): number {
    return this.totalItemCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  /** Last item number on the current page, clamped to the total. */
  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItemCount);
  }

  /**
   * {@link visiblePages} anchored with the first and last page, so the total page
   * count is on screen at md+ without consulting the readout.
   *
   * e.g. page 5 of 50 → `1 … 4 5 6 … 50`
   */
  get pageSlots(): MnPageSlot[] {
    const pages = this.visiblePages;
    if (pages.length === 0) return [];

    const first = pages[0];
    const last = pages[pages.length - 1];
    const slots: MnPageSlot[] = pages.map(page => ({page, anchor: false}));

    if (first > 1) {
      // Only insert a gap when the anchor isn't already adjacent to the window.
      if (first > 2) slots.unshift({page: null, anchor: true});
      slots.unshift({page: 1, anchor: true});
    }
    if (last < this.totalPages) {
      if (last < this.totalPages - 1) slots.push({page: null, anchor: true});
      slots.push({page: this.totalPages, anchor: true});
    }
    return slots;
  }

  /** Wrapper classes for a slot: anchors and their gaps are md+ only. */
  slotVisibility(slot: MnPageSlot): string {
    return slot.anchor ? 'hidden md:inline-flex' : 'inline-flex';
  }

  /** e.g. `Page 5 of 50`. */
  get pageIndicatorLabel(): string {
    return this.fill(this.labels?.pageIndicator || 'Page {{current}} of {{total}}', {
      current: this.currentPage,
      total: this.totalPages,
    });
  }

  /** e.g. `41–50 of 250`. */
  get itemRangeLabel(): string {
    return this.fill(this.labels?.itemRange || '{{start}}–{{end}} of {{total}}', {
      start: this.rangeStart,
      end: this.rangeEnd,
      total: this.totalItemCount,
    });
  }

  /**
   * Substitutes `{{name}}` placeholders, matching the interpolation syntax used
   * by MnLanguageService so the same translation strings work either way.
   */
  private fill(template: string, params: Record<string, number>): string {
    return Object.entries(params).reduce(
      (result, [key, value]) => result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value)),
      template,
    );
  }
}
