import {TemplateRef} from '@angular/core';
import {MnSkeletonProps} from '../mn-skeleton';
import {MnCollectionDataSource} from '../mn-collection';

// ── Grid Layout ──
/**
 * Controls the responsive card layout. Provide **either** `cols` (explicit column
 * counts per breakpoint) **or** `minCardWidth` (CSS `auto-fit`/`minmax`); when
 * `minCardWidth` is set it takes precedence and `cols` is ignored.
 *
 * Breakpoints match Tailwind defaults: sm 640px, md 768px, lg 1024px, xl 1280px.
 */
export type GridLayout = {
  /**
   * Explicit column count per breakpoint. Each falls back to the next-smaller one.
   * Counts are clamped to 1–12, the range Tailwind's `grid-cols-*` utilities cover.
   */
  cols?: { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
  /** Minimum card width, e.g. '18rem'. Enables auto-fit layout; ignores `cols`. */
  minCardWidth?: string;
  /** Gap between cards. Defaults to '1rem'. */
  gap?: string;
  /**
   * Caps the number of cards shown (preview mode, e.g. "first 3"). Intended for
   * `paginationMode: 'none'`; it slices the visible set and the pager stays hidden.
   */
  maxItems?: number;
}

// ── Grid Skeleton ──
/**
 * Customizes the loading-skeleton placeholder rendered for each card while data
 * loads. Provide a `TemplateRef` to profile the card's shape (the primary, most
 * useful form), or a set of stacked skeleton lines. When omitted, a default card
 * placeholder (image block + two text bars) is rendered.
 */
export type GridSkeleton =
  | TemplateRef<unknown>
  | { lines: Partial<MnSkeletonProps>[] };

// ── Grid Data Source ──
/**
 * Configures an {@link import('./mn-grid.component').MnGrid}.
 *
 * Empty state (inherited from {@link MnCollectionDataSource}): provide **either**
 * a default text via `emptyMessage` / `emptyMessageKey`, **or** a whole custom
 * component/markup via `emptyTemplate`. A supplied `emptyTemplate` is rendered
 * unwrapped — it fully controls its own layout — while the text variant gets the
 * grid's default centered placeholder.
 */
export type GridDataSource<T> = MnCollectionDataSource<T> & {
  /** Template used to render each card. Receives the item as `$implicit` and `data`. */
  cardTemplate: TemplateRef<unknown>;

  /** Customizes the loading-skeleton card shown while data loads. */
  skeleton?: GridSkeleton;

  /** Responsive layout configuration. */
  layout?: GridLayout;

  // Item interaction
  onItemClick?: (item: T) => void;

  // Toolbar
  /** Template rendered on the left of the toolbar, before the search field. */
  toolbarLeftTemplate?: TemplateRef<unknown>;
  /** Template rendered on the right of the toolbar, after the search field. */
  toolbarRightTemplate?: TemplateRef<unknown>;
  /**
   * @deprecated Use {@link toolbarRightTemplate}, which names the slot it fills.
   * Still honoured, and still rendered on the right, so existing callers keep
   * working unchanged.
   */
  toolbarTemplate?: TemplateRef<unknown>;
}
