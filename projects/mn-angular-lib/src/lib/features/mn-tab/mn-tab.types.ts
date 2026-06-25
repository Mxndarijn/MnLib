import {Signal} from '@angular/core';
import {MnCollectionState} from '../mn-collection';

/**
 * Configuration for a single tab item.
 */
export type MnTabItem = {
  /** Translation key or label text for the tab. */
  label: string;
  /** Callback invoked when this tab becomes active. */
  onClick?: () => void;
  /** Callback invoked when this tab is deactivated. */
  onDeactivate?: () => void;
  /** Optional notification count shown as a badge on the tab. Accepts a plain number or a Signal<number>. Hidden when 0 or absent. */
  badge?: number | Signal<number>;
}

/**
 * Data source configuration for the mn-tab component.
 */
export type MnTabDataSource = {
  /** List of tab items to display. */
  items: MnTabItem[];
  /** Index of the tab that should be active by default. */
  defaultActive: number;
  /**
   * Lifecycle state of the tab set. When {@link MnCollectionState.LOADING} the tab
   * bar renders a loading skeleton; any other state renders the real tabs.
   */
  state?: MnCollectionState;
  /**
   * Number of placeholder tabs to render while {@link state} is LOADING.
   * Defaults to the number of known `items`, falling back to 3 when no items are
   * known yet. Set this only when the real tabs are not yet known at load time
   * (e.g. tabs that depend on data being fetched) to predict the final count.
   */
  skeletonCount?: number;
}
