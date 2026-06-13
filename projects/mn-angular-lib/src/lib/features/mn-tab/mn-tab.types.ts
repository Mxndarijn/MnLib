import {Signal} from '@angular/core';

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
}
