import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {BehaviorSubject} from 'rxjs';
import {MnCollectionState, MnTable, TableDataSource} from 'mn-angular-lib';

/** Minimal row shape used by the configuration tests. */
type Row = {
  id: string;
  name: string;
}

/**
 * Covers what {@link MnTable} does with a *misconfigured* data source.
 *
 * A misconfiguration used to throw out of `ngOnInit`, which aborted the rest of
 * init: the rows were never filtered and the `dataRows` subscription was never
 * made, so the table rendered a permanently empty body that only filled in once
 * some later interaction (typing in the search box, changing a column filter)
 * happened to run the filter pass. That looked like a broken table rather than a
 * bad config — especially inside a modal, where the thrown error is easy to miss.
 * These tests pin the current contract: report loudly, repair, keep rendering.
 */
describe('MnTable data source configuration', () => {
  let fixture: ComponentFixture<MnTable<Row>>;
  let rows: BehaviorSubject<Row[]>;

  const ROWS: Row[] = [
    {id: '1', name: 'Alice'},
    {id: '2', name: 'Bob'},
  ];

  /** Builds a table data source with the given overrides applied. */
  function makeDataSource(overrides: Partial<TableDataSource<Row>> = {}): TableDataSource<Row> {
    return {
      dataRows: rows,
      getID: (row) => row.id,
      columns: [{key: 'name', header: 'Name', cell: (row) => row.name}],
      emptyMessage: 'No items',
      state: MnCollectionState.RETRIEVED,
      canSearch: false,
      ...overrides,
    };
  }

  beforeEach(async () => {
    rows = new BehaviorSubject<Row[]>([...ROWS]);
    spyOn(console, 'error');
    await TestBed.configureTestingModule({
      imports: [MnTable],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(MnTable<Row>);
  });

  it('still renders its rows when paginated is missing onPageChange and totalItems', () => {
    fixture.componentInstance.dataSource = makeDataSource({paginationMode: 'paginated', pageSize: 5});

    expect(() => fixture.detectChanges()).not.toThrow();

    expect(fixture.nativeElement.textContent).toContain('Alice');
    expect(fixture.nativeElement.textContent).toContain('Bob');
    expect(fixture.nativeElement.textContent).not.toContain('No items');
    expect(console.error).toHaveBeenCalled();
  });

  it('degrades a server-paginated source with no callbacks to client-side pagination', () => {
    const ds = makeDataSource({paginationMode: 'paginated', pageSize: 5});
    fixture.componentInstance.dataSource = ds;
    fixture.detectChanges();

    expect(ds.paginationMode).toBe('client-side-pagination');
  });

  it('keeps server-side pagination when the full contract is provided', () => {
    const ds = makeDataSource({
      paginationMode: 'paginated',
      pageSize: 5,
      totalItems: 40,
      onPageChange: () => undefined,
    });
    fixture.componentInstance.dataSource = ds;
    fixture.detectChanges();

    expect(ds.paginationMode).toBe('paginated');
    expect(console.error).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Alice');
  });

  it('widens pageSizeOptions to include an off-list pageSize instead of failing', () => {
    const ds = makeDataSource({
      paginationMode: 'client-side-pagination',
      pageSize: 8,
    });
    fixture.componentInstance.dataSource = ds;

    expect(() => fixture.detectChanges()).not.toThrow();

    expect(ds.pageSizeOptions).toContain(8);
    expect(fixture.nativeElement.textContent).toContain('Alice');
    expect(console.error).toHaveBeenCalled();
  });

  it('degrades load-more with no load mechanism to no pagination', () => {
    const ds = makeDataSource({paginationMode: 'load-more'});
    fixture.componentInstance.dataSource = ds;

    expect(() => fixture.detectChanges()).not.toThrow();

    expect(ds.paginationMode).toBe('none');
    expect(fixture.nativeElement.textContent).toContain('Alice');
  });

  it('applies table-fixed only for the fixed column layout', () => {
    fixture.componentInstance.dataSource = makeDataSource({appearance: {layout: 'fixed'}});
    fixture.detectChanges();

    const table: HTMLTableElement = fixture.nativeElement.querySelector('table');
    expect(table.classList).toContain('table-fixed');
    // Cell text is truncated rather than allowed to widen the column, and the full
    // value stays reachable as a tooltip.
    const cell: HTMLTableCellElement = fixture.nativeElement.querySelector('tbody td');
    expect(cell.classList).toContain('truncate');
    expect(cell.getAttribute('title')).toBe('Alice');
  });

  it('leaves column widths content-driven by default', () => {
    fixture.componentInstance.dataSource = makeDataSource();
    fixture.detectChanges();

    const table: HTMLTableElement = fixture.nativeElement.querySelector('table');
    expect(table.classList).not.toContain('table-fixed');
    const cell: HTMLTableCellElement = fixture.nativeElement.querySelector('tbody td');
    expect(cell.classList).not.toContain('truncate');
    expect(cell.getAttribute('title')).toBeNull();
  });
});
