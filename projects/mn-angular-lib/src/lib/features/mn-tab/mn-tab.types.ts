import {Signal} from '@angular/core';
import {MnCollectionState} from '../mn-collection';

/**
 * Configuration for a single tab item.
 */
export type MnTabItem = {
  /** Translation key or label text for the tab. */
  label: string;
  /**
   * Stable value this tab is written as in the URL while the tab bar mirrors
   * its selection there (see {@link MnTabDataSource.urlParam}).
   *
   * Defaults to a slug of the last segment of {@link label}
   * (`matches.hub.tab.entrants` → `entrants`, `members.tabMembers` →
   * `tab-members`). Set it when that slug is not the URL you want to hand out,
   * or when the label key may be renamed — a shared link is only as stable as
   * the value in it.
   */
  id?: string;
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
  /**
   * Query parameter the active tab is mirrored in, so a reload or a shared
   * link lands on the tab the user was looking at. Defaults to `'tab'`; pass
   * `false` to keep this tab bar out of the URL.
   *
   * Each tab bar that can be on screen at the same time as another needs its
   * own parameter name — two bars sharing one name fight over it. Turn it off
   * for a tab bar whose selection is not worth sharing, such as one inside a
   * modal, which would otherwise write to the URL of the page behind it.
   *
   * Only user selections are written, so a page nobody has clicked a tab on
   * keeps a clean URL and falls back to {@link defaultActive}. Restoring a tab
   * from the URL runs that tab's {@link MnTabItem.onClick} and emits
   * `activeChange`, so a consumer tracking the active tab itself hears about
   * the restored one.
   */
  urlParam?: string | false;
}
