import {TemplateRef} from '@angular/core';
import {MnSkeletonProps} from '../mn-skeleton';
import {MnCollectionLabels, MnSelectableCollectionDataSource} from '../mn-collection';

// ── List Skeleton ──
/**
 * Customizes the loading-skeleton placeholder rendered for each list item.
 * Either a set of skeleton lines (each a partial {@link MnSkeletonProps}) stacked
 * vertically, or a `TemplateRef` for a fully custom placeholder. When omitted,
 * two text-shaped lines (75% and 50% width) are used, matching the previous default.
 */
export type ListSkeleton =
  | { lines: Partial<MnSkeletonProps>[] }
  | TemplateRef<unknown>;

// ── List Appearance ──
export type ListAppearance = {
  /** Show a divider between items. Defaults to true. */
  dividers?: boolean;
  /** Highlight item on hover. Defaults to true. */
  hover?: boolean;
  /** Use compact (smaller) padding. */
  compact?: boolean;
  /** Show a border around the list. */
  bordered?: boolean;
}

// ── List Data Source ──
export type ListDataSource<T> = MnSelectableCollectionDataSource<T> & {
  /** Template used to render each list item. Receives the item as `$implicit` and `data`. */
  itemTemplate: TemplateRef<unknown>;

  /** Customizes the loading-skeleton placeholder shown for each item while data loads. */
  skeleton?: ListSkeleton;

  // Item interaction
  onItemClick?: (item: T) => void;

  // Appearance
  appearance?: ListAppearance;

  // Toolbar
  toolbarTemplate?: TemplateRef<unknown>;
}

/** @deprecated Use {@link MnCollectionLabels}. */
export type ListLabels = MnCollectionLabels;
