/**
 * Configuration for a single tab item.
 */
export interface MnTabItem {
  /** Translation key or label text for the tab. */
  label: string;
  /** Callback invoked when this tab becomes active. */
  onClick?: () => void;
  /** Callback invoked when this tab is deactivated. */
  onDeactivate?: () => void;
}

/**
 * Data source configuration for the mn-tab component.
 */
export interface MnTabDataSource {
  /** List of tab items to display. */
  items: MnTabItem[];
  /** Index of the tab that should be active by default. */
  defaultActive: number;
}
