import {ColumnDefinition, ColumnSortType} from './mn-table.types';

/**
 * Which column fills which slot of a row once the table is narrower than 640px and renders
 * composed rows instead of a grid. Every value column lands in exactly one place: a slot on the
 * row, the {@link sheet}, or nowhere when its `mobile` is `'hidden'`.
 */
export type MnTableRowLayout<T> = {
  /** A small block before the title (a rank, a thumbnail). */
  leading?: ColumnDefinition<T>;
  /** The row's name, up to two lines. */
  title?: ColumnDefinition<T>;
  /** The value at the right edge — the number or date compared down the list. */
  trailing?: ColumnDefinition<T>;
  /** The second line under the title. */
  meta: ColumnDefinition<T>[];
  /** Value columns only shown in the bottom sheet, in column order. */
  sheet: ColumnDefinition<T>[];
  /** Columns carrying row actions; they go to the sheet (or a ⋯ menu inside a modal). */
  actions: ColumnDefinition<T>[];
};

/** How many derived columns the second line takes before the rest goes to the sheet. */
export const ROW_META_LIMIT = 2;

/** Widest declared width, in px, that still reads as a leading block (a rank, an avatar). */
const LEADING_MAX_WIDTH_PX = 64;

/**
 * How far below the phone a column already is, from its `hiddenBelow`: shown on a phone today
 * (0), hidden below `sm` (1), `md` (2) or `lg` (3). The existing setting is a priority the app
 * already expressed — the lower the tier, the more the column matters.
 * @param column The column.
 * @returns Its tier.
 */
function tierOf<T>(column: ColumnDefinition<T>): number {
  switch (column.hiddenBelow) {
    case 'sm': return 1;
    case 'md': return 2;
    case 'lg': return 3;
    default: return 0;
  }
}

/**
 * Whether a column declares a narrow pixel width, the one signal that its content is a small
 * block rather than text.
 * @param column The column.
 * @returns True for a width like `60px`, up to {@link LEADING_MAX_WIDTH_PX}.
 */
function isNarrow<T>(column: ColumnDefinition<T>): boolean {
  const match = /^(\d+(?:\.\d+)?)px$/.exec(column.width?.trim() ?? '');
  return !!match && Number(match[1]) <= LEADING_MAX_WIDTH_PX;
}

/**
 * Whether a column holds a figure: sorted as a number, or aligned right like one.
 * @param column The column.
 * @returns True for a figure column.
 */
function isFigure<T>(column: ColumnDefinition<T>): boolean {
  return column.sortType === ColumnSortType.NUMERICAL || column.align === 'right';
}

/**
 * Derives the phone layout of a row from the column config the app already has, so a table
 * needs nothing new to read well on a phone. In order:
 *
 * 1. **Leading** — the first column a phone shows today, if it declares a width of 64px or less.
 * 2. **Title** — the next column a phone shows today (falling back to the first value column).
 * 3. **Trailing** — the first figure (sorted `NUMERICAL` or aligned right), otherwise the first
 *    `DATE` column, among the columns shown today or hidden below `sm`.
 * 4. **Meta** — up to {@link ROW_META_LIMIT} more: shown today, then hidden below `sm`, then
 *    below `md`, each tier in column order.
 * 5. **Sheet** — everything else, in column order.
 *
 * A column's `mobile` overrides all of this for that column: it is placed in the named slot
 * (`'hidden'` drops it) and taken out of the derivation. Explicit `'meta'` columns come first on
 * the second line and do not count against the limit.
 * @param columns The table's columns, in declaration order.
 * @returns The layout.
 */
export function resolveRowLayout<T>(columns: ColumnDefinition<T>[]): MnTableRowLayout<T> {
  const actions = columns.filter(c => !!c.actions);
  const values = columns.filter(c => !c.actions);
  const explicit = (slot: string) => values.filter(c => c.mobile === slot);
  const auto = values.filter(c => !c.mobile);
  const used = new Set<ColumnDefinition<T>>();
  const take = (column: ColumnDefinition<T> | undefined) => {
    if (column) used.add(column);
    return column;
  };

  const shownToday = auto.filter(c => tierOf(c) === 0);
  const leading = take(explicit('leading')[0] ?? (shownToday[0] && isNarrow(shownToday[0]) ? shownToday[0] : undefined));
  const title = take(
    explicit('title')[0]
    ?? shownToday.find(c => !used.has(c))
    ?? auto.find(c => !used.has(c)),
  );

  const nearPhone = auto.filter(c => !used.has(c) && tierOf(c) <= 1);
  const trailing = take(
    explicit('trailing')[0]
    ?? nearPhone.find(isFigure)
    ?? nearPhone.find(c => c.sortType === ColumnSortType.DATE),
  );

  const explicitMeta = explicit('meta');
  explicitMeta.forEach(c => used.add(c));
  const derivedMeta: ColumnDefinition<T>[] = [];
  for (const tier of [0, 1, 2]) {
    for (const column of auto) {
      if (derivedMeta.length >= ROW_META_LIMIT) break;
      if (used.has(column) || tierOf(column) !== tier) continue;
      derivedMeta.push(take(column)!);
    }
  }

  // A second explicit 'title' (or leading/trailing) has no slot left; the sheet keeps it.
  const sheet = values.filter(c => !used.has(c) && c.mobile !== 'hidden');
  return {leading, title, trailing, meta: [...explicitMeta, ...derivedMeta], sheet, actions};
}
