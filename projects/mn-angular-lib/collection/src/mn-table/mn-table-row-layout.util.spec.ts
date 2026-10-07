import {resolveRowLayout} from './mn-table-row-layout.util';
import {ColumnDefinition, ColumnSortType} from './mn-table.types';

/** A row shape wide enough for every fixture below. */
type Row = Record<string, string>;

/**
 * A plain string column.
 * @param key The column key.
 * @param extra Any further column settings.
 * @returns The column.
 */
function col(key: string, extra: Partial<ColumnDefinition<Row>> = {}): ColumnDefinition<Row> {
  return {key, header: key, cell: (row: Row) => row[key] ?? '', ...extra} as ColumnDefinition<Row>;
}

/** An actions column with one action. */
const actionsCol = {key: 'actions', header: 'Actions', actions: [{label: 'Edit', run: () => undefined}]} as ColumnDefinition<Row>;

/**
 * The keys of a list of columns, for readable expectations.
 * @param columns The columns.
 * @returns Their keys.
 */
function keys(columns: ColumnDefinition<Row>[]): string[] {
  return columns.map(c => c.key);
}

describe('resolveRowLayout', () => {
  it('lifts columns hidden below sm onto the row of a table that shows only a name today', () => {
    // The members table: one column on a phone today, three hidden below sm.
    const layout = resolveRowLayout([
      col('name', {sortType: ColumnSortType.ALPHABETICAL}),
      col('email', {hiddenBelow: 'sm'}),
      col('roles', {hiddenBelow: 'sm'}),
      col('memberSince', {hiddenBelow: 'sm', sortType: ColumnSortType.DATE}),
      actionsCol,
    ]);
    expect(layout.title?.key).toBe('name');
    expect(layout.trailing?.key).toBe('memberSince');
    expect(keys(layout.meta)).toEqual(['email', 'roles']);
    expect(layout.sheet).toEqual([]);
    expect(keys(layout.actions)).toEqual(['actions']);
  });

  it('puts the amount on the right and the state on the second line', () => {
    const layout = resolveRowLayout([
      col('description'),
      col('amount', {sortType: ColumnSortType.NUMERICAL}),
      col('status'),
      col('createdAt', {hiddenBelow: 'md', sortType: ColumnSortType.DATE}),
      actionsCol,
    ]);
    expect(layout.title?.key).toBe('description');
    expect(layout.trailing?.key).toBe('amount');
    expect(keys(layout.meta)).toEqual(['status', 'createdAt']);
  });

  it('treats a narrow first column as the leading block', () => {
    const layout = resolveRowLayout([
      col('rank', {width: '60px', sortType: ColumnSortType.NUMERICAL}),
      col('participant'),
      col('score', {sortType: ColumnSortType.NUMERICAL}),
    ]);
    expect(layout.leading?.key).toBe('rank');
    expect(layout.title?.key).toBe('participant');
    expect(layout.trailing?.key).toBe('score');
  });

  it('does not treat a wide or relative first column as leading', () => {
    expect(resolveRowLayout([col('type', {width: '12rem'}), col('name')]).leading).toBeUndefined();
    expect(resolveRowLayout([col('name', {width: '30%'}), col('x')]).leading).toBeUndefined();
    expect(resolveRowLayout([col('name', {width: '96px'}), col('x')]).title?.key).toBe('name');
  });

  it('prefers a figure over a date for the right side', () => {
    const layout = resolveRowLayout([
      col('name'),
      col('paidUntil', {sortType: ColumnSortType.DATE}),
      col('price', {hiddenBelow: 'sm', sortType: ColumnSortType.NUMERICAL}),
    ]);
    expect(layout.trailing?.key).toBe('price');
    expect(keys(layout.meta)).toEqual(['paidUntil']);
  });

  it('accepts a right-aligned column as a figure', () => {
    const layout = resolveRowLayout([col('name'), col('shifts', {align: 'right'})]);
    expect(layout.trailing?.key).toBe('shifts');
  });

  it('never takes the right side from a column hidden below md', () => {
    const layout = resolveRowLayout([
      col('name'),
      col('price', {hiddenBelow: 'md', sortType: ColumnSortType.NUMERICAL}),
    ]);
    expect(layout.trailing).toBeUndefined();
    expect(keys(layout.meta)).toEqual(['price']);
  });

  it('caps the second line and sends the rest to the sheet in column order', () => {
    const layout = resolveRowLayout([
      col('name'),
      col('a'),
      col('b', {hiddenBelow: 'sm'}),
      col('c', {hiddenBelow: 'md'}),
      col('d', {hiddenBelow: 'lg'}),
      col('e', {hiddenBelow: 'sm'}),
    ]);
    expect(keys(layout.meta)).toEqual(['a', 'b']);
    expect(keys(layout.sheet)).toEqual(['c', 'd', 'e']);
  });

  it('never puts a column hidden below lg on the row', () => {
    const layout = resolveRowLayout([col('name'), col('notes', {hiddenBelow: 'lg'})]);
    expect(layout.meta).toEqual([]);
    expect(keys(layout.sheet)).toEqual(['notes']);
  });

  it('falls back to the first value column for the title when a phone shows none today', () => {
    const layout = resolveRowLayout([col('association', {hiddenBelow: 'sm'}), col('date', {hiddenBelow: 'md'})]);
    expect(layout.title?.key).toBe('association');
  });

  describe('mobile override', () => {
    const meetings = (titleHint: boolean) => resolveRowLayout([
      col('startsAt', {sortType: ColumnSortType.DATE}),
      col('title', titleHint ? {mobile: 'title'} : {}),
      col('location', {hiddenBelow: 'md'}),
    ]);

    it('lets a date that comes first become the title without a hint', () => {
      expect(meetings(false).title?.key).toBe('startsAt');
    });

    it('moves the named column into the title and the date to the right with a hint', () => {
      const layout = meetings(true);
      expect(layout.title?.key).toBe('title');
      expect(layout.trailing?.key).toBe('startsAt');
      expect(keys(layout.meta)).toEqual(['location']);
    });

    it('drops a hidden column everywhere', () => {
      const layout = resolveRowLayout([col('name'), col('image', {hiddenBelow: 'sm', mobile: 'hidden'})]);
      expect(layout.meta).toEqual([]);
      expect(layout.sheet).toEqual([]);
    });

    it('sends a sheet column to the sheet even when it would have fitted on the row', () => {
      const layout = resolveRowLayout([col('name'), col('image', {mobile: 'sheet'}), col('audience')]);
      expect(keys(layout.meta)).toEqual(['audience']);
      expect(keys(layout.sheet)).toEqual(['image']);
    });

    it('places an explicit leading column and derives the rest around it', () => {
      const layout = resolveRowLayout([col('sequence', {mobile: 'leading'}), col('score'), col('scores')]);
      expect(layout.leading?.key).toBe('sequence');
      expect(layout.title?.key).toBe('score');
    });

    it('puts explicit meta first without counting it against the limit', () => {
      const layout = resolveRowLayout([col('name'), col('a'), col('b'), col('c'), col('flag', {mobile: 'meta'})]);
      expect(keys(layout.meta)).toEqual(['flag', 'a', 'b']);
      expect(keys(layout.sheet)).toEqual(['c']);
    });

    it('keeps a second explicit title in the sheet instead of losing it', () => {
      const layout = resolveRowLayout([col('a', {mobile: 'title'}), col('b', {mobile: 'title'})]);
      expect(layout.title?.key).toBe('a');
      expect(keys(layout.sheet)).toEqual(['b']);
    });
  });
});
