import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {BehaviorSubject} from 'rxjs';
import {ColumnDefinition, MnColumnFilter, MnTable, TableDataSource} from 'mn-angular-lib';

/** Minimal row shape used by the column-filter tests. */
type Row = {
  id: string;
  name: string;
  age: number;
}

/**
 * Covers {@link MnTable}'s per-column filtering: local filtering when the table
 * owns the data, and delegation to the consumer when `onColumnFilterChange` is
 * set — the mode a server-paginated table must use, because filtering the rows
 * it holds would only narrow the page the server already returned.
 */
describe('MnTable column filters', () => {
  let fixture: ComponentFixture<MnTable<Row>>;
  let rows: BehaviorSubject<Row[]>;

  const ROWS: Row[] = [
    {id: '1', name: 'Ada', age: 36},
    {id: '2', name: 'Grace', age: 45},
    {id: '3', name: 'Alan', age: 41},
  ];

  /** Builds a data source with the given columns, optionally server-filtered. */
  function makeDataSource(
    columns: ColumnDefinition<Row>[],
    onColumnFilterChange?: (filters: MnColumnFilter[]) => void,
  ): TableDataSource<Row> {
    return {
      dataRows: rows,
      getID: (row) => row.id,
      columns,
      emptyMessage: 'No items',
      canSearch: false,
      onColumnFilterChange,
    };
  }

  /** A plain text-filterable name column. */
  function nameColumn(): ColumnDefinition<Row> {
    return {key: 'name', header: 'Name', cell: (row) => row.name, filterable: true};
  }

  /**
   * The inline filter controls live inside `th` cells, which the browser renders
   * bold — the controls inherit that unless the row resets it. They are form
   * fields, not headings, so bold is wrong; this pins the reset in place.
   */
  it('renders the inline filter controls at normal weight, not the header bold', () => {
    fixture.componentInstance.dataSource = makeDataSource([nameColumn()]);
    fixture.detectChanges();

    const filterRow: HTMLTableRowElement =
      fixture.nativeElement.querySelector('thead tr:nth-child(2)');
    expect(filterRow).withContext('inline filter row should be rendered').toBeTruthy();

    for (const cell of Array.from(filterRow.cells)) {
      expect(cell.classList).toContain('font-normal');
    }

    // The heading row itself must stay bold.
    const header: HTMLTableCellElement =
      fixture.nativeElement.querySelector('thead tr:first-child th[data-column-key]');
    expect(header.classList).not.toContain('font-normal');
  });

  /** A number-range-filterable age column. */
  function ageColumn(): ColumnDefinition<Row> {
    return {
      key: 'age',
      header: 'Age',
      cell: (row) => String(row.age),
      getRawValueToSort: (row) => row.age,
      filterable: true,
      filterType: 'number-range',
    };
  }

  beforeEach(async () => {
    rows = new BehaviorSubject<Row[]>(ROWS);
    await TestBed.configureTestingModule({
      imports: [MnTable],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(MnTable<Row>);
  });

  it('filters rows locally when the consumer does not own filtering', () => {
    const component = fixture.componentInstance;
    const columns = [nameColumn()];
    component.dataSource = makeDataSource(columns);
    fixture.detectChanges();

    component.onColumnFilter(columns[0], 'a');
    expect(component.filteredItems.map(r => r.name)).toEqual(['Ada', 'Grace', 'Alan']);

    component.onColumnFilter(columns[0], 'al');
    expect(component.filteredItems.map(r => r.name)).toEqual(['Alan']);
  });

  it('combines filters across columns', () => {
    const component = fixture.componentInstance;
    const columns = [nameColumn(), ageColumn()];
    component.dataSource = makeDataSource(columns);
    fixture.detectChanges();

    component.onColumnFilter(columns[0], 'a');
    component.onColumnFilter(columns[1], {min: 40});
    expect(component.filteredItems.map(r => r.name)).toEqual(['Grace', 'Alan']);
  });

  it('delegates to onColumnFilterChange instead of filtering locally', fakeAsync(() => {
    const component = fixture.componentInstance;
    const received: MnColumnFilter[][] = [];
    const columns = [ageColumn()];
    component.dataSource = makeDataSource(columns, filters => received.push(filters));
    fixture.detectChanges();

    component.onColumnFilter(columns[0], {min: 40});
    tick();

    expect(received).toEqual([[{key: 'age', type: 'number-range', value: {min: 40}}]]);
    // The rows the consumer supplied must be left untouched — they are already the
    // filtered page, and filtering them again here would drop rows a second time.
    expect(component.filteredItems.length).toBe(3);
  }));

  it('debounces server-side text filters but not other types', fakeAsync(() => {
    const component = fixture.componentInstance;
    const received: MnColumnFilter[][] = [];
    const columns = [nameColumn(), ageColumn()];
    component.dataSource = makeDataSource(columns, filters => received.push(filters));
    fixture.detectChanges();

    component.onColumnFilter(columns[0], 'a');
    component.onColumnFilter(columns[0], 'ad');
    component.onColumnFilter(columns[0], 'ada');
    expect(received.length).toBe(0);

    // A non-text filter is not debounced, so it fires straight away.
    component.onColumnFilter(columns[1], {min: 40});
    expect(received.length).toBe(1);

    tick(300);
    expect(received.length).toBe(2);
    // One request for the whole run of keystrokes, carrying the final text.
    expect(received[1]).toEqual([
      {key: 'name', type: 'text', value: 'ada'},
      {key: 'age', type: 'number-range', value: {min: 40}},
    ]);
  }));

  it('omits unset filters from the delegated payload', fakeAsync(() => {
    const component = fixture.componentInstance;
    const received: MnColumnFilter[][] = [];
    const columns = [nameColumn(), ageColumn()];
    component.dataSource = makeDataSource(columns, filters => received.push(filters));
    fixture.detectChanges();

    component.onColumnFilter(columns[1], {min: 40});
    component.onColumnFilter(columns[1], {});
    tick();

    expect(received[1]).toEqual([]);
  }));

  it('resets to the first page when a filter changes', () => {
    const component = fixture.componentInstance;
    const columns = [nameColumn()];
    component.dataSource = makeDataSource(columns);
    fixture.detectChanges();

    component.currentPage = 3;
    component.onColumnFilter(columns[0], 'a');
    expect(component.currentPage).toBe(1);
  });

  it('clears every filter back to its empty value', fakeAsync(() => {
    const component = fixture.componentInstance;
    const received: MnColumnFilter[][] = [];
    const columns = [nameColumn(), ageColumn()];
    component.dataSource = makeDataSource(columns, filters => received.push(filters));
    fixture.detectChanges();

    component.onColumnFilter(columns[1], {min: 40});
    expect(component.hasActiveFilters).toBe(true);

    component.clearAllFilters();
    tick();

    expect(component.hasActiveFilters).toBe(false);
    expect(received[received.length - 1]).toEqual([]);
  }));

  it('renders rich filter types behind a popover instead of inline', () => {
    const component = fixture.componentInstance;
    const columns = [nameColumn(), ageColumn()];
    component.dataSource = makeDataSource(columns);
    fixture.detectChanges();

    expect(component.isInlineFilter(columns[0])).toBe(true);
    expect(component.isInlineFilter(columns[1])).toBe(false);
    expect(component.isPopoverFilter(columns[1])).toBe(true);
  });
});
