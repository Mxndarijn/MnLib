import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { ColumnSortType, MnCollectionState, MnTable, TableDataSource } from 'mn-angular-lib';

/** A member row. */
type Member = { id: string; name: string };

/**
 * Builds members.
 * @param count How many.
 * @returns Members m1…mN.
 */
function members(count: number): Member[] {
  return Array.from({ length: count }, (_, i) => ({ id: `m${i + 1}`, name: `Member ${i + 1}` }));
}

/** Hosts the table in a phone-wide box. */
@Component({
  standalone: true,
  imports: [MnTable],
  // A spec host stays Eager so fixture.detectChanges() reaches the OnPush table (see CLAUDE.md).
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div style="width: 375px"><mn-table [dataSource]="dataSource"></mn-table></div>`,
})
class HostComponent {
  dataSource!: TableDataSource<Member>;
}

/**
 * Covers "Load more" below 640px: a paginated table grows its first page instead of paging, so
 * a consumer that reloads after an edit gets the whole visible list back, and the rows already
 * on screen stay there while the bigger page loads.
 */
describe('MnTable phone "Load more" (below 640px)', () => {
  let fixture: ComponentFixture<HostComponent>;

  /**
   * Renders the host with a data source.
   * @param source The table's data source.
   */
  function render(source: TableDataSource<Member>): void {
    fixture.componentInstance.dataSource = source;
    fixture.detectChanges();
    // Re-measure once laid out, as a real resize would.
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
  }

  /** @returns The composed rows that hold data (skeleton rows are aria-hidden). */
  function rows(): HTMLLIElement[] {
    return (Array.from(fixture.nativeElement.querySelectorAll('[role="region"] ul > li')) as HTMLLIElement[])
      .filter((li) => li.getAttribute('aria-hidden') !== 'true');
  }

  /** @returns The skeleton rows. */
  function skeletons(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="region"] ul > li[aria-hidden="true"]'));
  }

  /** @returns The "Load more" button, or null. */
  function loadMore(): HTMLButtonElement | null {
    return (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
      .find((b) => b.textContent?.trim() === 'Load more') ?? null;
  }

  /** @returns The "10 of 25" line's text, or null. */
  function countText(): string | null {
    return fixture.nativeElement.querySelector('span[aria-live="polite"].text-xs')?.textContent?.trim() ?? null;
  }

  /** @returns Whether the numbered pager is on screen. */
  function hasPager(): boolean {
    return !!fixture.nativeElement.querySelector('mn-collection-pagination');
  }

  /**
   * A client-side paginated source.
   * @param count How many rows it holds.
   * @returns The data source.
   */
  function clientSource(count: number): TableDataSource<Member> {
    return {
      dataRows: new BehaviorSubject<Member[]>(members(count)),
      getID: (m) => m.id,
      columns: [{ key: 'name', header: 'Name', cell: (m) => m.name, sortType: ColumnSortType.ALPHABETICAL }],
      emptyMessage: 'None',
      canSearch: false,
      paginationMode: 'client-side-pagination',
      pageSize: 10,
    };
  }

  /**
   * A server-side paginated source that serves the first page of `total` rows.
   * @param total How many rows the server has.
   * @param sizes Records every page size the table asks for; null for a source without the handler.
   * @param extra Further settings.
   * @returns The data source.
   */
  function serverSource(total: number, sizes: number[] | null, extra: Partial<TableDataSource<Member>> = {}): TableDataSource<Member> {
    return {
      dataRows: new BehaviorSubject<Member[]>(members(Math.min(10, total))),
      getID: (m) => m.id,
      columns: [{ key: 'name', header: 'Name', cell: (m) => m.name }],
      emptyMessage: 'None',
      canSearch: false,
      paginationMode: 'paginated',
      pageSize: 10,
      totalItems: total,
      onPageChange: () => undefined,
      ...(sizes ? { onPageSizeChange: (size: number) => sizes.push(size) } : {}),
      ...extra,
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  afterEach(() => fixture?.destroy());

  it('offers "Load more" with a count instead of the pager', () => {
    render(clientSource(25));
    expect(rows().length).toBe(10);
    expect(loadMore()).not.toBeNull();
    expect(countText()).toBe('10 of 25');
    expect(hasPager()).toBeFalse();
  });

  it('grows a client-side list by a page per tap, and stops at the end', () => {
    render(clientSource(25));
    loadMore()!.click();
    fixture.detectChanges();
    expect(rows().length).toBe(20);
    expect(countText()).toBe('20 of 25');

    loadMore()!.click();
    fixture.detectChanges();
    expect(rows().length).toBe(25);
    expect(loadMore()).toBeNull();
    expect(hasPager()).toBeFalse();
  });

  it('keeps a grown list through a resize that stays below 640px', () => {
    render(clientSource(25));
    loadMore()!.click();
    fixture.detectChanges();
    // A phone fires resize whenever its address bar slides.
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(rows().length).toBe(20);
  });

  it('asks a server for a bigger first page and keeps the rows up while it loads', () => {
    const sizes: number[] = [];
    const source = serverSource(30, sizes);
    render(source);
    loadMore()!.click();
    fixture.detectChanges();
    expect(sizes).toEqual([20]);

    // The consumer marks the collection as loading, as loadCollection does.
    source.state = MnCollectionState.LOADING;
    fixture.detectChanges();
    expect(skeletons().length).toBe(0);
    expect(rows().length).toBe(10);
    expect(loadMore()!.disabled).toBeTrue();

    source.state = MnCollectionState.RETRIEVED;
    source.dataRows.next(members(20));
    fixture.detectChanges();
    expect(rows().length).toBe(20);
    expect(loadMore()!.disabled).toBeFalse();
    expect(countText()).toBe('20 of 30');
  });

  it('counts and grows from the rows a server shows, not the size the table asked for', () => {
    // A consumer whose own first load (25) answers after the table's request for 10.
    const sizes: number[] = [];
    const source = serverSource(61, sizes);
    source.dataRows.next(members(25));
    render(source);
    expect(countText()).toBe('25 of 61');
    loadMore()!.click();
    expect(sizes).toEqual([35]);
  });

  it('keeps the pager for a server source that cannot change its page size', () => {
    render(serverSource(30, null));
    expect(loadMore()).toBeNull();
    expect(hasPager()).toBeTrue();
  });

  it('hands back to the pager once the page reaches maxPageSize', () => {
    const sizes: number[] = [];
    const source = serverSource(300, sizes, { maxPageSize: 20 });
    render(source);
    loadMore()!.click();
    source.dataRows.next(members(20));
    fixture.detectChanges();
    expect(sizes).toEqual([20]);
    expect(loadMore()).toBeNull();
    expect(hasPager()).toBeTrue();
  });
});
