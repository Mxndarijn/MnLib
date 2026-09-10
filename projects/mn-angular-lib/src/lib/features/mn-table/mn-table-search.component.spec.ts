import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {BehaviorSubject} from 'rxjs';
import {MnCollectionState, MnTable, TableDataSource} from 'mn-angular-lib';

/** Minimal row shape used by the search auto-enable tests. */
type Row = {
  id: string;
  name: string;
}

/**
 * Builds `count` rows named `Row 1` … `Row n`.
 * @param count Number of rows to build.
 */
function makeRows(count: number): Row[] {
  return Array.from({length: count}, (_, i) => ({id: String(i + 1), name: `Row ${i + 1}`}));
}

/**
 * Verifies the search box's auto-enable rule on {@link MnTable}: with `canSearch` unset the
 * box appears once the row count reaches the threshold (default 8), only when the source can
 * actually search, and an explicit `canSearch` always wins. Mirrors the mn-select /
 * mn-multi-select `searchable` / `searchThreshold` contract.
 */
describe('MnTable search auto-enable', () => {
  let fixture: ComponentFixture<MnTable<Row>>;

  /**
   * Builds a table data source over `rowCount` rows with a client search predicate.
   * @param rowCount Number of rows to seed.
   * @param extra Fields merged over the defaults (e.g. `canSearch`, `searchThreshold`).
   */
  function makeDataSource(rowCount: number, extra: Partial<TableDataSource<Row>> = {}): TableDataSource<Row> {
    return {
      dataRows: new BehaviorSubject<Row[]>(makeRows(rowCount)),
      getID: (row) => row.id,
      columns: [{key: 'name', header: 'Name', cell: (row) => row.name}],
      emptyMessage: 'No items',
      state: MnCollectionState.RETRIEVED,
      paginationMode: 'none',
      isInSearch: (row, term) => row.name.toLowerCase().includes(term),
      ...extra,
    };
  }

  /** The toolbar's search input, or `null` when the box is not rendered. */
  function searchInput(): HTMLInputElement | null {
    return fixture.nativeElement.querySelector('input[type="search"]');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnTable],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(MnTable<Row>);
  });

  it('hides the search box below the default threshold when canSearch is unset', () => {
    fixture.componentInstance.dataSource = makeDataSource(7);
    fixture.detectChanges();

    expect(searchInput()).toBeNull();
  });

  it('shows the search box once the row count reaches the default threshold of 8', () => {
    fixture.componentInstance.dataSource = makeDataSource(8);
    fixture.detectChanges();

    expect(searchInput()).not.toBeNull();
  });

  it('honours a custom searchThreshold', () => {
    fixture.componentInstance.dataSource = makeDataSource(3, {searchThreshold: 3});
    fixture.detectChanges();

    expect(searchInput()).not.toBeNull();
  });

  it('never auto-enables when the source has no way to search', () => {
    fixture.componentInstance.dataSource = makeDataSource(20, {isInSearch: undefined});
    fixture.detectChanges();

    expect(searchInput()).toBeNull();
  });

  it('auto-enables for a server-searched source without a client predicate', () => {
    fixture.componentInstance.dataSource = makeDataSource(8, {isInSearch: undefined, onServerSearch: () => undefined});
    fixture.detectChanges();

    expect(searchInput()).not.toBeNull();
  });

  it('counts totalItems, not the current page, for a server-paginated source', () => {
    fixture.componentInstance.dataSource = makeDataSource(5, {paginationMode: 'paginated', totalItems: 40, onPageChange: () => undefined});
    fixture.detectChanges();

    expect(searchInput()).not.toBeNull();
  });

  it('lets an explicit canSearch: false suppress the box on a long list', () => {
    fixture.componentInstance.dataSource = makeDataSource(20, {canSearch: false});
    fixture.detectChanges();

    expect(searchInput()).toBeNull();
  });

  it('lets an explicit canSearch: true force the box on a short list', () => {
    fixture.componentInstance.dataSource = makeDataSource(2, {canSearch: true});
    fixture.detectChanges();

    expect(searchInput()).not.toBeNull();
  });

  it('keeps the box while a term is typed even if the rows drop below the threshold', () => {
    const ds = makeDataSource(8);
    fixture.componentInstance.dataSource = ds;
    fixture.detectChanges();
    expect(fixture.componentInstance.isSearchable).toBeTrue();

    // A server-side search would replace dataRows with the (shorter) result set.
    fixture.componentInstance.searchValue = 'Row 1';
    ds.dataRows.next(makeRows(2));

    expect(fixture.componentInstance.isSearchable).toBeTrue();
  });

  it('filters rows through isInSearch once auto-enabled', () => {
    fixture.componentInstance.dataSource = makeDataSource(10);
    fixture.detectChanges();

    fixture.componentInstance.searchValue = 'row 10';
    (fixture.componentInstance as unknown as {applyFilter(searchForItems: boolean): void}).applyFilter(false);

    expect(fixture.componentInstance.filteredItems.map(r => r.id)).toEqual(['10']);
  });
});
