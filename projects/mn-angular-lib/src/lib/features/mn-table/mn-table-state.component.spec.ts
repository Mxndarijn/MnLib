import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {BehaviorSubject} from 'rxjs';
import {MnCollectionState, MnTable, TableDataSource} from 'mn-angular-lib';

/** Minimal row shape used by the state-rendering tests. */
interface Row {
  id: string;
  name: string;
}

/**
 * Verifies that {@link MnTable} renders the correct chrome for each
 * {@link MnCollectionState}: skeletons while LOADING, the error placeholder on
 * ERROR, the empty state on RETRIEVED-with-no-rows, and that the legacy
 * `isDataLoading` boolean still drives the skeleton. The ERROR test also proves
 * the zoneless re-render contract: flipping `state` only repaints once the
 * consumer re-emits on `dataRows`.
 */
describe('MnTable data lifecycle state', () => {
  let fixture: ComponentFixture<MnTable<Row>>;
  let rows: BehaviorSubject<Row[]>;

  /**
   * Builds a minimal table data source in the given state.
   * @param state The lifecycle state to render.
   */
  function makeDataSource(state?: MnCollectionState): TableDataSource<Row> {
    return {
      dataRows: rows,
      getID: (row) => row.id,
      columns: [{key: 'name', header: 'Name', cell: (row) => row.name}],
      emptyMessage: 'No items',
      errorMessage: 'Could not load',
      state,
      canSearch: false,
    };
  }

  beforeEach(async () => {
    rows = new BehaviorSubject<Row[]>([]);
    await TestBed.configureTestingModule({
      imports: [MnTable],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(MnTable<Row>);
  });

  it('renders skeleton placeholders while LOADING', () => {
    fixture.componentInstance.dataSource = makeDataSource(MnCollectionState.LOADING);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mn-skeleton')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Could not load');
  });

  it('renders the empty state when RETRIEVED with no rows', () => {
    fixture.componentInstance.dataSource = makeDataSource(MnCollectionState.RETRIEVED);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No items');
    expect(fixture.nativeElement.querySelector('mn-skeleton')).toBeNull();
  });

  it('shows the error placeholder when state flips to ERROR and rows re-emit', () => {
    const ds = makeDataSource(MnCollectionState.RETRIEVED);
    fixture.componentInstance.dataSource = ds;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No items');

    // A failed reload: flip the state, then re-emit on dataRows so the zoneless
    // component runs change detection and re-reads the new state.
    ds.state = MnCollectionState.ERROR;
    rows.next([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not load');
    expect(fixture.nativeElement.textContent).not.toContain('No items');
  });

  it('honours the legacy isDataLoading boolean when state is unset', () => {
    const ds = makeDataSource();
    ds.isDataLoading = true;
    fixture.componentInstance.dataSource = ds;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mn-skeleton')).toBeTruthy();
  });
});
