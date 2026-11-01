import { ChangeDetectionStrategy, Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { ColumnSortType, MnCollectionState, MnTable, TableDataSource } from 'mn-angular-lib';

/** Minimal row for the toolbar-wrap layout check. */
type Row = { id: string; name: string; status: string };

/**
 * Hosts mn-table at ~600px with a non-wrapping left toolbar label beside search +
 * Filters — the overflow shape on announcements/slideshows (spYV0YV5 / GRRU8s1V).
 */
@Component({
  standalone: true,
  imports: [MnTable],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="host" [style.width.px]="width" style="overflow-x: auto">
      <ng-template #left>
        <span class="whitespace-nowrap text-lg font-semibold">Announcements list heading</span>
      </ng-template>
      @if (dataSource) {
        <mn-table [dataSource]="dataSource"></mn-table>
      }
    </div>
  `,
})
class HostComponent {
  width = 600;
  dataSource: TableDataSource<Row> | null = null;
  @ViewChild('left', { static: true }) left!: TemplateRef<unknown>;
}

describe('MnTable toolbar wrap (~600px, spYV0YV5)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  function render(width = 600): { host: HTMLElement; toolbar: HTMLElement } {
    const hostCmp = fixture.componentInstance;
    hostCmp.width = width;
    hostCmp.dataSource = {
      dataRows: new BehaviorSubject<Row[]>([
        { id: '1', name: 'Alpha', status: 'Open' },
        { id: '2', name: 'Beta', status: 'Closed' },
      ]),
      getID: (row) => row.id,
      columns: [
        {
          key: 'name',
          header: 'Name',
          cell: (row) => row.name,
          sortType: ColumnSortType.ALPHABETICAL,
        },
        {
          key: 'status',
          header: 'Status',
          cell: (row) => row.status,
          filterable: true,
          filterType: 'select',
          filterOptions: [
            { value: 'Open', label: 'Open' },
            { value: 'Closed', label: 'Closed' },
          ],
        },
      ],
      emptyMessage: 'None',
      state: MnCollectionState.RETRIEVED,
      paginationMode: 'none',
      canSearch: true,
      filtersLabel: 'Filters',
      isInSearch: (row, term) => row.name.toLowerCase().includes(term),
      toolbarLeftTemplate: hostCmp.left,
    };
    fixture.detectChanges();
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('.host') as HTMLElement;
    const tableEl = fixture.debugElement.query(By.directive(MnTable)).nativeElement as HTMLElement;
    const toolbar = tableEl.querySelector('.mb-3') as HTMLElement;
    return { host, toolbar };
  }

  it('wraps the toolbar at 600px so search + Filters never force horizontal scroll', () => {
    const { host, toolbar } = render(600);

    expect(toolbar).withContext('toolbar should render').toBeTruthy();
    expect(toolbar.querySelector('input[type="search"]')).not.toBeNull();
    expect(toolbar.querySelector('button[aria-controls="mn-table-filters-panel"]')).not.toBeNull();
    expect(toolbar.textContent).toContain('Announcements list heading');

    // Fail-before: toolbar lacked `flex-wrap` (nowrap row at ~600px → page h-scroll).
    expect(toolbar.className.split(/\s+/)).toContain('flex-wrap');
    expect(toolbar.className.split(/\s+/)).toContain('min-w-0');

    expect(host.scrollWidth)
      .withContext(`host overflowed: scroll=${host.scrollWidth} client=${host.clientWidth}`)
      .toBeLessThanOrEqual(host.clientWidth + 1);
  });
});
