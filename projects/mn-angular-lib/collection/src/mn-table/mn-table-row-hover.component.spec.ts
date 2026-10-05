import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { MnCollectionState, MnTable, TableDataSource } from 'mn-angular-lib';

/** Minimal row shape used by the row-hover tests. */
type Row = {
  id: string;
  name: string;
};

/**
 * Builds a data source over two rows with the given overrides applied.
 * @param overrides Fields to set on top of the minimal source.
 * @returns The data source.
 */
function makeDataSource(overrides: Partial<TableDataSource<Row>> = {}): TableDataSource<Row> {
  return {
    dataRows: new BehaviorSubject<Row[]>([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]),
    getID: (row) => row.id,
    columns: [{ key: 'name', header: 'Name', cell: (row) => row.name }],
    emptyMessage: 'No items',
    state: MnCollectionState.RETRIEVED,
    canSearch: false,
    ...overrides,
  };
}

/** Host binding the table's `(rowClick)` output, the way a page opens a row from the template. */
@Component({
  standalone: true,
  imports: [MnTable],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<mn-table [dataSource]="dataSource" (rowClick)="clicked = $event"></mn-table>`,
})
class RowClickHostComponent {
  dataSource = makeDataSource();
  clicked: Row | null = null;
}

/**
 * The hover wash and the pointer promise that clicking a row does something, so a table
 * only gives them to rows that do: a data-source `onRowClick`, a bound `(rowClick)`, or
 * row selection.
 */
describe('MnTable row hover', () => {
  /** The rendered data rows of a fixture. */
  const dataRows = (fixture: ComponentFixture<unknown>): HTMLElement[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'))
      .filter((tr) => tr.textContent?.includes('Alice') || tr.textContent?.includes('Bob')) as HTMLElement[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnTable, RowClickHostComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('leaves the rows of a table that does nothing on click plain', () => {
    const fixture = TestBed.createComponent(MnTable<Row>);
    fixture.componentInstance.dataSource = makeDataSource();
    fixture.detectChanges();

    const rows = dataRows(fixture);
    expect(rows.length).toBe(2);
    for (const row of rows) {
      expect(row.classList).not.toContain('hover:bg-base-200');
      expect(row.classList).not.toContain('cursor-pointer');
      expect(row.classList).not.toContain('hover:cursor-pointer');
    }
  });

  it('washes and points at rows when the data source handles the click', () => {
    const fixture = TestBed.createComponent(MnTable<Row>);
    fixture.componentInstance.dataSource = makeDataSource({ onRowClick: () => undefined });
    fixture.detectChanges();

    for (const row of dataRows(fixture)) {
      expect(row.classList).toContain('hover:bg-base-200');
      expect(row.classList).toContain('cursor-pointer');
    }
  });

  it('washes and points at rows when the page binds (rowClick)', () => {
    const fixture = TestBed.createComponent(RowClickHostComponent);
    fixture.detectChanges();

    const rows = dataRows(fixture);
    for (const row of rows) {
      expect(row.classList).toContain('hover:bg-base-200');
      expect(row.classList).toContain('cursor-pointer');
    }

    rows[0].click();
    expect(fixture.componentInstance.clicked?.id).toBe('1');
  });

  it('keeps the pointer but drops the wash when a clickable table turns hover off', () => {
    const fixture = TestBed.createComponent(MnTable<Row>);
    fixture.componentInstance.dataSource = makeDataSource({
      onRowClick: () => undefined,
      appearance: { hover: false },
    });
    fixture.detectChanges();

    for (const row of dataRows(fixture)) {
      expect(row.classList).not.toContain('hover:bg-base-200');
      expect(row.classList).toContain('cursor-pointer');
    }
  });
});
