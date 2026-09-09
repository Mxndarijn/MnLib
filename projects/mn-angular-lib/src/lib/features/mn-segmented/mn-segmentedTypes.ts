import { MnActionIcon } from '../mn-dropdown';
import { MnSegmentedVariants } from './mn-segmentedVariants';

/**
 * One choice in a {@link MnSegmented} control.
 *
 * A segment is a label, an icon, or both. Icon-only segments carry no visible
 * text, so they need an {@link ariaLabel} to stay reachable by name.
 */
export type MnSegmentedItem = {
  /** Value emitted when this segment is picked; also identifies the active one. */
  value: string;
  /** Translation key or literal label. Omit for an icon-only segment. */
  label?: string;
  /**
   * Optional leading icon: a `TemplateRef` (full control over the icon set — an
   * `<mn-icon>`, an emoji, a bespoke `<svg>`) or lucide icon *data* such as
   * `LucideList.icon`. The same convention the dropdown's actions use; see
   * {@link MnActionIcon}.
   */
  icon?: MnActionIcon;
  /**
   * Accessible name of the segment. Required when {@link label} is omitted,
   * since an icon alone names nothing; ignored otherwise — the label is the name.
   */
  ariaLabel?: string;
  /** Whether this choice cannot be picked. Defaults to false. */
  disabled?: boolean;
};

/**
 * Data source for {@link MnSegmented}.
 *
 * The control is a single-choice switch: exactly one of {@link items} is active
 * at a time, and which one is decided by the consumer through
 * {@link MnSegmented.value} rather than by the control itself.
 */
export type MnSegmentedDataSource = {
  /** The choices, in the order they are shown. Two or three read best. */
  items: MnSegmentedItem[];
  /** Visual scale. Defaults to `'md'`. */
  size?: 'sm' | 'md';
  /**
   * Corner rounding, in mn-button's radius tokens plus `'full'` for a pill.
   * Defaults to `'lg'`. The segments follow the track one step tighter, so the
   * active segment stays nested inside the track's corner.
   */
  borderRadius?: MnSegmentedVariants['borderRadius'];
  /**
   * Translation key or literal naming what the group switches, e.g. "View".
   * Without it the group is an unnamed set of buttons to a screen reader.
   */
  ariaLabel?: string;
};
