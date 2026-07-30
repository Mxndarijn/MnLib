import {
  defaultFilterPredicate,
  emptyFilterValue,
  isFilterValueActive,
  matchesColumnFilter,
  resolveFilterableValue,
} from './mn-table-filter.util';
import {ColumnDefinition} from './mn-table.types';

type Row = { name: string; age: number; active: boolean; joined: string };

const row: Row = {name: 'Ada Lovelace', age: 36, active: true, joined: '2026-03-15'};

describe('mn-table filter util', () => {
  describe('emptyFilterValue', () => {
    it('gives each type a value that reads as unset', () => {
      expect(isFilterValueActive(emptyFilterValue('text'))).toBe(false);
      expect(isFilterValueActive(emptyFilterValue('select'))).toBe(false);
      expect(isFilterValueActive(emptyFilterValue('boolean'))).toBe(false);
      expect(isFilterValueActive(emptyFilterValue('multi-select'))).toBe(false);
    });
  });

  describe('isFilterValueActive', () => {
    it('treats false as an active boolean filter, not an empty one', () => {
      // The whole reason a truthiness check is not enough: "show only inactive rows".
      expect(isFilterValueActive(false)).toBe(true);
      expect(isFilterValueActive(true)).toBe(true);
    });

    it('ignores whitespace-only text and empty collections', () => {
      expect(isFilterValueActive('   ')).toBe(false);
      expect(isFilterValueActive([])).toBe(false);
    });
  });

  describe('defaultFilterPredicate', () => {
    it('matches text case-insensitively on a substring', () => {
      expect(defaultFilterPredicate('text', 'Ada Lovelace', 'love')).toBe(true);
      expect(defaultFilterPredicate('text', 'Ada Lovelace', 'byron')).toBe(false);
    });

    it('requires exact equality for select, unlike text', () => {
      expect(defaultFilterPredicate('select', 'ACTIVE', 'ACTIVE')).toBe(true);
      expect(defaultFilterPredicate('select', 'INACTIVE', 'ACTIVE')).toBe(false);
    });

    it('ORs across multi-select values', () => {
      expect(defaultFilterPredicate('multi-select', 'B', ['A', 'B'])).toBe(true);
      expect(defaultFilterPredicate('multi-select', 'C', ['A', 'B'])).toBe(false);
    });

    it('compares boolean filters against the truthiness of the raw value', () => {
      expect(defaultFilterPredicate('boolean', true, true)).toBe(true);
      expect(defaultFilterPredicate('boolean', false, false)).toBe(true);
      expect(defaultFilterPredicate('boolean', true, false)).toBe(false);
    });

  });

  describe('resolveFilterableValue', () => {
    it('prefers getRawValueToSort over the rendered cell string', () => {
      const column = {
        key: 'age',
        header: 'Age',
        cell: () => 'thirty six',
        getRawValueToSort: (r: Row) => r.age,
      } as ColumnDefinition<Row>;
      expect(resolveFilterableValue(column, row)).toBe(36);
    });

    it('falls back to an empty string for template cells with no raw accessor', () => {
      // Template columns have no string to read, which is why they need getRawValueToSort.
      const column = {key: 'name', header: 'Name', cell: {} as never} as ColumnDefinition<Row>;
      expect(resolveFilterableValue(column, row)).toBe('');
    });
  });

  describe('matchesColumnFilter', () => {
    it('delegates to a column filterFn when present', () => {
      const column = {
        key: 'name',
        header: 'Name',
        cell: (r: Row) => r.name,
        filterable: true,
        filterFn: (r: Row, value: string) => r.name.startsWith(value),
      } as ColumnDefinition<Row>;

      expect(matchesColumnFilter(column, row, 'Ada')).toBe(true);
      // Substring semantics would pass here; the custom prefix predicate must win.
      expect(matchesColumnFilter(column, row, 'Lovelace')).toBe(false);
    });

    it('falls back to the type default when no filterFn is given', () => {
      const column = {
        key: 'name',
        header: 'Name',
        cell: (r: Row) => r.name,
        filterable: true,
        filterType: 'select',
      } as ColumnDefinition<Row>;

      // `select` is exact equality, unlike the substring default for `text`.
      expect(matchesColumnFilter(column, row, 'Ada Lovelace')).toBe(true);
      expect(matchesColumnFilter(column, row, 'Ada')).toBe(false);
    });
  });
});
