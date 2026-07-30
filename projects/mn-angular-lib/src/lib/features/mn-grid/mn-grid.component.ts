import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {LucideDynamicIcon} from '@lucide/angular';
import {GridDataSource} from './mn-grid.types';
import {MnSkeleton, MnSkeletonProps} from '../mn-skeleton';
import {MnInputField} from '../mn-input-field';
import {MnCollectionBase, MnCollectionPagination} from '../mn-collection';

/** Default card skeleton: an image block plus two text bars. */
const DEFAULT_GRID_SKELETON_LINES: Partial<MnSkeletonProps>[] = [
  {shape: 'rectangle', width: '100%', height: '8rem'},
  {shape: 'text', width: '75%'},
  {shape: 'text', width: '50%', height: '0.75rem'},
];

/** Breakpoints a `cols` map may address, ordered small → large. */
const GRID_BREAKPOINTS = ['base', 'sm', 'md', 'lg', 'xl'] as const;

/** One of the breakpoints in {@link GRID_BREAKPOINTS}. */
type GridBreakpoint = (typeof GRID_BREAKPOINTS)[number];

/** Highest column count with a pre-generated class; larger requests clamp to it. */
const MAX_GRID_COLS = 12;

/**
 * Column utilities per breakpoint, indexed by `columns - 1`.
 *
 * Spelled out as literals on purpose: the consuming app's Tailwind scanner reads
 * the shipped bundle, so a name assembled at runtime (`sm:grid-cols-${n}`) would
 * never be generated. Breakpoints are Tailwind's defaults (sm 640, md 768,
 * lg 1024, xl 1280), and each unset one simply inherits the next-smaller class.
 */
const GRID_COL_CLASSES: Record<GridBreakpoint, readonly string[]> = {
  base: [
    'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6',
    'grid-cols-7', 'grid-cols-8', 'grid-cols-9', 'grid-cols-10', 'grid-cols-11', 'grid-cols-12',
  ],
  sm: [
    'sm:grid-cols-1', 'sm:grid-cols-2', 'sm:grid-cols-3', 'sm:grid-cols-4', 'sm:grid-cols-5', 'sm:grid-cols-6',
    'sm:grid-cols-7', 'sm:grid-cols-8', 'sm:grid-cols-9', 'sm:grid-cols-10', 'sm:grid-cols-11', 'sm:grid-cols-12',
  ],
  md: [
    'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4', 'md:grid-cols-5', 'md:grid-cols-6',
    'md:grid-cols-7', 'md:grid-cols-8', 'md:grid-cols-9', 'md:grid-cols-10', 'md:grid-cols-11', 'md:grid-cols-12',
  ],
  lg: [
    'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4', 'lg:grid-cols-5', 'lg:grid-cols-6',
    'lg:grid-cols-7', 'lg:grid-cols-8', 'lg:grid-cols-9', 'lg:grid-cols-10', 'lg:grid-cols-11', 'lg:grid-cols-12',
  ],
  xl: [
    'xl:grid-cols-1', 'xl:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4', 'xl:grid-cols-5', 'xl:grid-cols-6',
    'xl:grid-cols-7', 'xl:grid-cols-8', 'xl:grid-cols-9', 'xl:grid-cols-10', 'xl:grid-cols-11', 'xl:grid-cols-12',
  ],
};

/**
 * Picks the column utility for a breakpoint, clamped to the range that has one.
 * @param breakpoint Breakpoint the class applies from.
 * @param columns Requested column count.
 * @returns The Tailwind class name.
 */
function gridColClass(breakpoint: GridBreakpoint, columns: number): string {
  const index = Math.min(Math.max(Math.round(columns), 1), MAX_GRID_COLS) - 1;
  return GRID_COL_CLASSES[breakpoint][index];
}

/**
 * Responsive card-grid component. Shares the collection chrome (search, every
 * pagination mode, loading skeleton, empty state, toolbar, i18n) with
 * {@link import('../mn-list').MnList} and {@link import('../mn-table').MnTable}
 * via {@link MnCollectionBase}, and lays items out as cards instead of rows.
 * Selection is intentionally not supported.
 */
@Component({
  selector: 'mn-grid',
  standalone: true,
  imports: [NgTemplateOutlet, FormsModule, MnSkeleton, MnInputField, MnCollectionPagination, LucideDynamicIcon],
  templateUrl: './mn-grid.component.html',
  host: {class: 'block'},
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnGrid<T = unknown> extends MnCollectionBase<T, GridDataSource<T>> {
  @Output() itemClick = new EventEmitter<T>();

  protected override readonly componentName = 'MnGrid';

  /** Whether the grid uses auto-fit (minCardWidth) instead of explicit columns. */
  get isAutoLayout(): boolean {
    return !!this.dataSource.layout?.minCardWidth;
  }

  // ── Layout ──

  /**
   * Classes for the card container: `grid` plus one column utility per
   * breakpoint the consumer configured. Omitted for the auto-fit layout, whose
   * columns come from {@link autoTemplateColumns} instead.
   */
  get gridClasses(): string {
    if (this.isAutoLayout) {
      return 'grid';
    }

    const cols = this.dataSource.layout?.cols;
    const classes = ['grid', gridColClass('base', cols?.base ?? 1)];

    for (const breakpoint of GRID_BREAKPOINTS) {
      if (breakpoint === 'base') continue;
      const columns = cols?.[breakpoint];
      if (columns != null) {
        classes.push(gridColClass(breakpoint, columns));
      }
    }

    return classes.join(' ');
  }

  /** Gap between cards. */
  get gridGap(): string {
    return this.dataSource.layout?.gap ?? '1rem';
  }

  /**
   * Inline `grid-template-columns` for the auto-fit layout, or null when explicit
   * `cols` are used (the utilities in {@link gridClasses} then own the columns).
   * `minCardWidth` is a free-form CSS length, so it can only be expressed inline.
   */
  get autoTemplateColumns(): string | null {
    const minCardWidth = this.dataSource.layout?.minCardWidth;
    return minCardWidth ? `repeat(auto-fit, minmax(${minCardWidth}, 1fr))` : null;
  }

  /** Skeleton lines for the default/lines placeholder; null when a custom template is used. */
  get skeletonLines(): Partial<MnSkeletonProps>[] {
    const skeleton = this.dataSource.skeleton;
    if (skeleton && !this.isTemplateRef(skeleton)) {
      return skeleton.lines;
    }
    return DEFAULT_GRID_SKELETON_LINES;
  }

  // ── Item interaction ──

  /**
   * The toolbar template the base class watches for identity changes. Prefers the
   * left slot, then the right, then the deprecated `toolbarTemplate`, so a grid
   * using any single slot still re-renders when that template is swapped.
   */
  protected get trackedToolbarTemplate(): TemplateRef<unknown> | undefined {
    return (
      this.dataSource?.toolbarLeftTemplate ??
      this.dataSource?.toolbarRightTemplate ??
      this.dataSource?.toolbarTemplate
    );
  }

  @ViewChild('collectionBody') protected collectionBody?: ElementRef<HTMLElement>;

  // ── Skeleton ──

  onItemClick(item: T): void {
    this.dataSource.onItemClick?.(item);
    this.itemClick.emit(item);
  }

  // ── Filtering ──

  protected applyFilter(searchForItems: boolean): void {
    let items = this.applySearchFilter(this.dataSource.dataRows.value ?? []);

    // Preview cap: show only the first `maxItems` cards (pager stays hidden).
    const maxItems = this.dataSource.layout?.maxItems;
    if (maxItems != null) {
      items = items.slice(0, maxItems);
    }

    this.filteredItems = items;
    this.applyPagination();

    if (searchForItems) {
      this.loadMoreRows();
    }
  }
}
