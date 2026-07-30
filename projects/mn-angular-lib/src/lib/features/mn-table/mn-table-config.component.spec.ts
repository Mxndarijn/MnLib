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

  it('hides responsive columns behind container queries, not viewport ones', () => {
    fixture.componentInstance.dataSource = makeDataSource({
      columns: [
        {key: 'name', header: 'Name', cell: (row) => row.name},
        {key: 'sm', header: 'Sm', cell: () => 'sm', hiddenBelow: 'sm'},
        {key: 'md', header: 'Md', cell: () => 'md', hiddenBelow: 'md'},
        {key: 'lg', header: 'Lg', cell: () => 'lg', hiddenBelow: 'lg'},
      ],
    });
    fixture.detectChanges();

    // The table's chrome must declare itself a container, or the `@` variants below
    // have nothing to measure and would never match.
    expect(fixture.nativeElement.querySelector('.\\@container')).toBeTruthy();

    const classesFor = (key: string): string => {
      const index = ['name', 'sm', 'md', 'lg'].indexOf(key);
      const cells = fixture.nativeElement.querySelectorAll('tbody tr:first-child td');
      return (cells[index] as HTMLElement).className;
    };

    // Container thresholds, deliberately below the viewport breakpoints of the same
    // name: a page table sits inside a sidebar + padding and never gets the full
    // window, so reusing 1024px for `lg` would hide the column on a 1280px screen.
    expect(classesFor('sm')).toContain('@min-[480px]:table-cell');
    expect(classesFor('md')).toContain('@min-[640px]:table-cell');
    expect(classesFor('lg')).toContain('@min-[800px]:table-cell');
    // No viewport-scoped variant may survive, or a modal would reveal columns it
    // has no room for.
    for (const key of ['sm', 'md', 'lg']) {
      expect(classesFor(key)).not.toMatch(/(^|\s)(sm|md|lg):table-cell/);
    }
    expect(classesFor('name')).not.toContain('hidden');
  });

  it('leaves column widths content-driven for the explicit auto layout', () => {
    fixture.componentInstance.dataSource = makeDataSource({appearance: {layout: 'auto'}});
    fixture.detectChanges();

    const table: HTMLTableElement = fixture.nativeElement.querySelector('table');
    expect(table.classList).not.toContain('table-fixed');
    const cell: HTMLTableCellElement = fixture.nativeElement.querySelector('tbody td');
    expect(cell.classList).not.toContain('truncate');
    expect(cell.getAttribute('title')).toBeNull();
  });

  it('defaults to the stable layout', () => {
    fixture.componentInstance.dataSource = makeDataSource();
    fixture.detectChanges();

    expect(fixture.componentInstance.layoutMode).toBe('stable');
  });

  it('measures widths with the automatic layout before pinning them', () => {
    // While the rows are still loading there is nothing worth measuring: the
    // skeleton placeholders would pin the bars' widths instead of the data's.
    fixture.componentInstance.dataSource = makeDataSource({state: MnCollectionState.LOADING});
    fixture.detectChanges();

    const table: HTMLTableElement = fixture.nativeElement.querySelector('table');
    expect(table.classList).not.toContain('table-fixed');
    expect(fixture.componentInstance.widthsArePinned).toBeFalse();
  });

  it('pins the measured widths once real rows are on screen', async () => {
    fixture.componentInstance.dataSource = makeDataSource({
      columns: [
        {key: 'name', header: 'Name', cell: (row) => row.name},
        {key: 'note', header: 'Note', cell: () => 'a considerably longer cell value than the name'},
      ],
    });
    fixture.detectChanges();
    // The pin happens in an after-render hook, so let it flush and re-render.
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.widthsArePinned).toBeTrue();
    const table: HTMLTableElement = fixture.nativeElement.querySelector('table');
    expect(table.classList).toContain('table-fixed');

    // A concrete pixel width, captured from the automatic pass — not an even split,
    // and no longer following the content.
    const headers: HTMLTableCellElement[] =
      Array.from(fixture.nativeElement.querySelectorAll('thead th[data-column-key]'));
    const pinned = headers.filter((th) => th.style.width !== '');
    expect(pinned.length).toBe(1);
    expect(pinned[0].style.width).toMatch(/^\d+px$/);

    // The widest column stays elastic so the pinned widths cannot over-subscribe the
    // container and force a horizontal scrollbar.
    const elastic = headers.filter((th) => th.style.width === '');
    expect(elastic.length).toBe(1);
    expect(elastic[0].dataset['columnKey']).toBe('note');

    const cell: HTMLTableCellElement = fixture.nativeElement.querySelector('tbody td');
    expect(cell.classList).toContain('truncate');
    expect(cell.getAttribute('title')).toBe('Alice');
  });

  it('never lets the pinned widths overflow the table', async () => {
    fixture.componentInstance.dataSource = makeDataSource({
      columns: [
        {key: 'name', header: 'Name', cell: (row) => row.name},
        {key: 'email', header: 'Email', cell: () => 'someone.with.a.long.address@example-company.com'},
        {key: 'role', header: 'Role', cell: () => 'Developer', width: '140px'},
      ],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const wrapper: HTMLElement = fixture.nativeElement.querySelector('.overflow-x-auto');
    // scrollWidth > clientWidth is exactly the spurious-scrollbar symptom.
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(wrapper.clientWidth);
  });

  it('lets a declared width win over a pinned one', async () => {
    fixture.componentInstance.dataSource = makeDataSource({
      columns: [
        {key: 'name', header: 'Name', cell: (row) => row.name, width: '123px'},
        {key: 'note', header: 'Note', cell: () => 'a much longer value that will be the widest column'},
      ],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const header: HTMLTableCellElement =
      fixture.nativeElement.querySelector('thead th[data-column-key="name"]');
    expect(header.style.width).toBe('123px');
  });

  /**
   * The point of the summary: it answers "what is selected?" even when those rows
   * are not on screen. A server-paginated table holds one page, so the selection
   * has to survive the rows themselves being replaced.
   */
  it('keeps showing a selected row after its page is replaced', async () => {
    const rows = new BehaviorSubject<Row[]>([{id: '1', name: 'Alice'}, {id: '2', name: 'Bob'}]);
    fixture.componentInstance.dataSource = makeDataSource({
      dataRows: rows,
      selectionMode: 'multi',
      selectionSummary: true,
      initialSelectedIds: ['1'],
      columns: [{key: 'name', header: 'Name', cell: (row) => row.name}],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const summaryText = (): string =>
      fixture.nativeElement.querySelector('ul')?.textContent?.trim() ?? '';
    expect(summaryText()).toContain('Alice');

    // Page 2 arrives: Alice is no longer among the loaded rows.
    rows.next([{id: '3', name: 'Charlie'}, {id: '4', name: 'Dana'}]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const bodyText: string = fixture.nativeElement.querySelector('tbody').textContent ?? '';
    expect(bodyText).not.toContain('Alice');
    // ...but the summary still names her, which is the whole feature.
    expect(summaryText()).toContain('Alice');
  });

  it('hides the selection summary when nothing is selected', () => {
    fixture.componentInstance.dataSource = makeDataSource({
      selectionMode: 'multi',
      selectionSummary: true,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ul')).toBeNull();
  });

  it('removes a single row from the selection via its tag', async () => {
    fixture.componentInstance.dataSource = makeDataSource({
      selectionMode: 'multi',
      selectionSummary: true,
      initialSelectedIds: ['1'],
      columns: [{key: 'name', header: 'Name', cell: (row) => row.name}],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const remove: HTMLButtonElement = fixture.nativeElement.querySelector('ul button');
    expect(remove).toBeTruthy();
    remove.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedIds.size).toBe(0);
    expect(fixture.nativeElement.querySelector('ul')).toBeNull();
  });

  it('collapses a large selection behind a show-more control', async () => {
    const many: Row[] = Array.from({length: 30}, (_, i) => ({id: String(i), name: `Row ${i}`}));
    fixture.componentInstance.dataSource = makeDataSource({
      dataRows: new BehaviorSubject<Row[]>(many),
      selectionMode: 'multi',
      selectionSummary: true,
      initialSelectedIds: many.map((row) => row.id),
      columns: [{key: 'name', header: 'Name', cell: (row) => row.name}],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const tags = (): number =>
      fixture.nativeElement.querySelectorAll('ul li span.truncate').length;

    // 30 selected, but only the default 8 tags render, so the summary cannot grow
    // without bound and shove the table off screen.
    expect(tags()).toBe(8);
    expect(fixture.componentInstance.hiddenSelectionCount).toBe(22);
    // The heading still reports the true total: tags are hidden, information is not.
    expect(fixture.componentInstance.selectionSummaryTitle).toContain('30');

    fixture.componentInstance.toggleSelectionSummary();
    fixture.detectChanges();
    expect(tags()).toBe(30);
    expect(fixture.componentInstance.hiddenSelectionCount).toBe(0);
  });

  it('gives the select-all header the same background as the rest of the header row', () => {
    fixture.componentInstance.dataSource = makeDataSource({selectionMode: 'multi'});
    fixture.detectChanges();

    const headers: HTMLTableCellElement[] =
      Array.from(fixture.nativeElement.querySelectorAll('thead tr:first-child th'));
    // The checkbox cell used to paint itself base-200 while every neighbour stayed
    // transparent over the row's base-100, leaving a lighter patch in the corner.
    for (const header of headers) {
      expect(header.classList).not.toContain('bg-base-200');
    }
  });
});
