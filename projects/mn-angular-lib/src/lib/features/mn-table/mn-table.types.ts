import {TemplateRef} from '@angular/core';
import {MnSkeletonProps} from '../mn-skeleton';
import {MnCollectionLabels, MnSelectableCollectionDataSource} from '../mn-collection';

// ── Column Sort Type ──
export enum ColumnSortType {
  ALPHABETICAL = 'ALPHABETICAL',
  NUMERICAL = 'NUMERICAL',
  DATE = 'DATE',
  NONE = 'NONE',
}

// ── Sort State ──
export type SortState = {
  columnKey: string;
  direction: 'asc' | 'desc';
}

// ── Appearance ──
export type TableAppearance = {
  striped?: boolean;
  hover?: boolean;
  compact?: boolean;
  bordered?: boolean;
}

// ── Column Filter Type ──
export type ColumnFilterType = 'text' | 'select';

// ── Column Filter Option ──
export type ColumnFilterOption = {
  label: string;
  value: string;
}

// ── Column Skeleton ──
/**
 * Customizes the loading-skeleton placeholder rendered in a column's cells.
 * Either a partial {@link MnSkeletonProps} (shape/width/height/animated) or a
 * `TemplateRef` for a fully custom placeholder. When omitted, a text-shaped
 * skeleton at 75% width is used (matching the previous default).
 */
export type ColumnSkeleton = Partial<MnSkeletonProps> | TemplateRef<unknown>;

// ── Column Definition ──
export type ColumnDefinition<T> = {
  key: string;
  header: string | TemplateRef<unknown>;
  /** Translation key for the column header. When set, mn-table resolves it via MnLanguageService and keeps it updated on locale change. */
  headerKey?: string;
  cell: ((row: T) => string) | TemplateRef<unknown>;
  /** Alternative cell renderer shown below the given breakpoint. When set, `cell` is hidden below this breakpoint and `cellSm` is shown instead. */
  cellSm?: { below: 'sm' | 'md' | 'lg'; cell: ((row: T) => string) | TemplateRef<unknown> };
  sortType?: ColumnSortType;
  getRawValueToSort?: (row: T) => unknown;
  width?: string;
  align?: 'left' | 'center' | 'right';
  hiddenBelow?: 'sm' | 'md' | 'lg';
  /** Whether this column supports per-column filtering. */
  filterable?: boolean;
  /** Type of filter input: 'text' for free-text, 'select' for dropdown. Defaults to 'text'. */
  filterType?: ColumnFilterType;
  /** Options for 'select' filter type. */
  filterOptions?: ColumnFilterOption[];
  /** Placeholder text for the filter input. */
  filterPlaceholder?: string;
  /** Translation key for the filter placeholder. When set, mn-table resolves it via MnLanguageService. */
  filterPlaceholderKey?: string;
  /** Whether the filter input is disabled. */
  filterDisabled?: boolean;
  /** Autocomplete attribute for the filter input. */
  filterAutocomplete?: string;
  /** Maximum character length for text filter inputs. */
  filterMaxLength?: number;
  /** Custom filter function. Receives the row and the current filter value. */
  filterFn?: (row: T, filterValue: string) => boolean;
  /** Customizes the loading-skeleton placeholder shown in this column's cells while data loads. */
  skeleton?: ColumnSkeleton;
}

// ── Table Data Source ──
export type TableDataSource<T> = MnSelectableCollectionDataSource<T> & {
  columns: ColumnDefinition<T>[];

  // Sorting
  defaultSort?: SortState;

  // Row interaction
  onRowClick?: (row: T) => void;

  // Appearance
  appearance?: TableAppearance;

  // Toolbar
  /** Template rendered on the left side of the toolbar (before the search field). */
  toolbarLeftTemplate?: TemplateRef<unknown>;
  /** Template rendered on the right side of the toolbar (after the search field). */
  toolbarRightTemplate?: TemplateRef<unknown>;
}

/** @deprecated Use {@link MnCollectionLabels}. */
export type TableLabels = MnCollectionLabels;
