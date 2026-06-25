import {Component, DoCheck, EventEmitter, Input, isSignal, Output} from '@angular/core';
import {MnTranslatePipe} from '../../language';
import {MnTabDataSource, MnTabItem} from './mn-tab.types';
import {CommonModule} from '@angular/common';
import {MnBadge} from '../mn-badge';
import {MnSkeleton} from '../mn-skeleton';

/** Fallback number of skeleton tabs when no items are known and no count is given. */
const DEFAULT_SKELETON_TAB_COUNT = 3;

/**
 * Tab component that renders a horizontal tab bar.
 * Supports translation keys for labels via MnTranslatePipe.
 */
@Component({
  selector: 'mn-tab',
  standalone: true,
  imports: [MnTranslatePipe, CommonModule, MnBadge, MnSkeleton],
  templateUrl: './mn-tab.component.html',
})
export class MnTabComponent implements DoCheck {
  /** Data source containing tab items and default active index. */
  @Input() dataSource!: MnTabDataSource;

  /**
   * Whether to enable horizontal scrolling when items overflow.
   * If true, tabs will scroll horizontally instead of shrinking too much.
   */
  @Input() scrollable = false;

  /**
   * Whether tabs should stretch to fill the available width.
   * Defaults to false, so tabs only take as much space as their content.
   */
  @Input() justified = false;

  /** Emits the newly activated tab item whenever the active tab changes. */
  @Output() activeChange = new EventEmitter<MnTabItem>();

  /** The currently active tab item. */
  currentActive?: MnTabItem;

  /**
   * Index array sizing the loading skeleton: `skeletonCount` when provided,
   * otherwise the number of known items, falling back to a default when none.
   */
  get skeletonTabs(): number[] {
    const count =
      this.dataSource.skeletonCount ??
      (this.dataSource.items.length || DEFAULT_SKELETON_TAB_COUNT);
    return Array.from({length: count}, (_, index) => index);
  }

  /**
   * Re-resolves the active tab on every change-detection pass.
   *
   * The data source is often populated or rebuilt asynchronously (tabs that
   * depend on fetched data or permissions). Resolving the active tab only once
   * at init would leave {@link currentActive} pointing at a stale item — the
   * tab bar would then highlight nothing and swallow the first click — so the
   * selection is kept in sync with whatever the data source currently holds.
   */
  ngDoCheck(): void {
    this.syncActiveTab();
  }

  /**
   * Sets the given tab item as active, invoking deactivate/activate callbacks.
   * @param item - The tab item to activate.
   */
  setActive(item: MnTabItem): void {
    if (this.currentActive === item) {
      return;
    }
    this.currentActive?.onDeactivate?.();
    item.onClick?.();
    this.currentActive = item;
    this.activeChange.emit(item);
  }

  /**
   * Returns the resolved badge value for a tab item, supporting both plain numbers and Signal<number>.
   * @param item - The tab item whose badge to resolve.
   */
  getBadge(item: MnTabItem): number | undefined {
    if (isSignal(item.badge)) return item.badge();
    return item.badge;
  }

  /**
   * Ensures {@link currentActive} references a tab that still exists in the data
   * source, falling back to the configured default tab when the current
   * selection is missing or stale (e.g. after the items array is replaced).
   */
  private syncActiveTab(): void {
    const items = this.dataSource?.items;
    if (!items || items.length === 0) {
      this.currentActive = undefined;
      return;
    }
    if (this.currentActive && items.includes(this.currentActive)) {
      return;
    }
    const defaultIndex = this.dataSource.defaultActive;
    const index =
      defaultIndex >= 0 && defaultIndex < items.length ? defaultIndex : 0;
    this.currentActive = items[index];
  }
}
