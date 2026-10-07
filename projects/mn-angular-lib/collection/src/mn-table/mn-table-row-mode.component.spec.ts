import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { ColumnDefinition, ColumnSortType, MN_IN_MODAL, MnTable, TableDataSource } from 'mn-angular-lib';

/** A member row, wide enough for every slot. */
type Member = {
  id: string;
  name: string;
  email: string;
  roles: string;
  since: string;
  lanes: string;
  notes: string;
};

const MEMBERS: Member[] = [
  { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', roles: 'Board', since: '2019-03-03', lanes: '3', notes: 'Keyholder' },
  { id: '2', name: 'Alan Turing', email: 'alan@example.com', roles: 'Member', since: '2021-06-01', lanes: '1', notes: '' },
];

/** Hosts the table in a box of a given width, the way a page or a modal does. */
@Component({
  standalone: true,
  imports: [MnTable],
  // A spec host stays Eager so fixture.detectChanges() reaches the OnPush table (see CLAUDE.md).
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div [style.width.px]="width"><mn-table [dataSource]="dataSource"></mn-table></div>`,
})
class HostComponent {
  width = 375;
  dataSource!: TableDataSource<Member>;
}

/**
 * Covers the composed-row layout mn-table switches to below 640px: what a row shows, what a
 * tap does in each kind of table, the detail sheet with its actions, the modal exception and
 * sorting from the filter sheet. The slot rule itself is covered by mn-table-row-layout.util.spec.
 */
describe('MnTable row mode (below 640px)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let edited: Member[];
  let deleted: Member[];

  /**
   * The members table: one column on a phone today, the rest hidden below sm/md/lg, plus actions.
   * @param extra Data-source settings for the test at hand.
   * @param lanesShownToday Whether the bare-figure `lanes` column is shown on phones today.
   * @returns The data source.
   */
  function dataSource(extra: Partial<TableDataSource<Member>> = {}, lanesShownToday = false): TableDataSource<Member> {
    return {
      dataRows: new BehaviorSubject<Member[]>(MEMBERS),
      getID: (m) => m.id,
      columns: [
        { key: 'name', header: 'Name', cell: (m) => m.name, sortType: ColumnSortType.ALPHABETICAL },
        { key: 'email', header: 'E-mail', cell: (m) => m.email, hiddenBelow: 'sm' },
        { key: 'roles', header: 'Roles', cell: (m) => m.roles, hiddenBelow: 'sm' },
        { key: 'since', header: 'Member since', cell: (m) => m.since, hiddenBelow: 'sm', sortType: ColumnSortType.DATE },
        { key: 'lanes', header: 'Lanes', cell: (m) => m.lanes, ...(lanesShownToday ? {} : { hiddenBelow: 'md' as const }) },
        { key: 'notes', header: 'Notes', cell: (m) => m.notes, hiddenBelow: 'lg' },
        {
          key: 'actions',
          header: 'Actions',
          actions: [
            { label: 'Edit', run: (m) => edited.push(m) },
            { label: 'Delete', danger: true, run: (m) => deleted.push(m) },
          ],
        } as ColumnDefinition<Member>,
      ],
      emptyMessage: 'No members',
      canSearch: false,
      ...extra,
    };
  }

  /**
   * Renders the host at a width.
   * @param source The table's data source.
   * @param width The box width in px.
   */
  function render(source: TableDataSource<Member>, width = 375): void {
    fixture.componentInstance.dataSource = source;
    fixture.componentInstance.width = width;
    fixture.detectChanges();
    // Re-measure once laid out, as a real resize would: the first measurement can run before
    // the box has its final width.
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
  }

  /** @returns The table component instance. */
  function table(): MnTable<Member> {
    return fixture.debugElement.query(By.directive(MnTable)).componentInstance as MnTable<Member>;
  }

  /** @returns The composed rows. */
  function rows(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="region"] ul > li')) as HTMLLIElement[];
  }

  /** @returns The open bottom sheet, wherever it renders, or null. */
  function sheet(): HTMLElement | null {
    return document.querySelector('mn-bottom-sheet');
  }

  /**
   * Configures the testing module.
   * @param inModal Whether the table renders inside an mn modal.
   */
  async function setup(inModal = false): Promise<void> {
    edited = [];
    deleted = [];
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        ...(inModal ? [{ provide: MN_IN_MODAL, useValue: true }] : []),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  }

  afterEach(() => fixture?.destroy());

  describe('outside a modal', () => {
    beforeEach(() => setup());

    it('renders composed rows instead of a grid', () => {
      render(dataSource());
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
      expect(fixture.nativeElement.querySelector('thead')).toBeNull();
      expect(rows().length).toBe(2);
    });

    it('lifts the columns hidden on a phone today onto the row', () => {
      render(dataSource());
      const text = rows()[0].textContent ?? '';
      expect(text).toContain('Ada Lovelace');
      expect(text).toContain('ada@example.com');
      expect(text).toContain('Board');
      expect(text).toContain('2019-03-03');
      // Hidden below lg: only in the sheet.
      expect(text).not.toContain('Keyholder');
    });

    it('renders the grid again from 640px', () => {
      render(dataSource(), 800);
      expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
      expect(rows().length).toBe(0);
    });

    it('opens a sheet with the whole record and the actions on a tap', () => {
      render(dataSource());
      (rows()[0].querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      const open = sheet();
      expect(open).not.toBeNull();
      const terms = Array.from(open!.querySelectorAll('dt')).map((dt) => dt.textContent?.trim());
      expect(terms).toEqual(['E-mail', 'Roles', 'Lanes', 'Notes']);
      expect(open!.querySelector('h2')?.textContent).toContain('Ada Lovelace');
      const labels = Array.from(open!.querySelectorAll('button[mnButton]')).map((b) => b.textContent?.trim());
      expect(labels).toEqual(['Edit', 'Delete']);
    });

    it('closes the sheet before running the chosen action with its row', fakeAsync(() => {
      render(dataSource());
      (rows()[1].querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      const edit = Array.from(sheet()!.querySelectorAll('button[mnButton]'))
        .find((b) => b.textContent?.trim() === 'Edit') as HTMLButtonElement;
      edit.click();
      tick(1000);
      flush();
      fixture.detectChanges();

      expect(edited).toEqual([MEMBERS[1]]);
      expect(sheet()).toBeNull();
    }));

    it("keeps a row's own click handler and adds a ⋯ button for the sheet", () => {
      const clicked: Member[] = [];
      render(dataSource({ onRowClick: (m) => clicked.push(m) }));

      const main = rows()[0].querySelector('button:not([aria-label])') as HTMLButtonElement;
      main.click();
      fixture.detectChanges();
      expect(clicked).toEqual([MEMBERS[0]]);
      expect(sheet()).toBeNull();

      const more = rows()[0].querySelector('button[aria-label="Details for Ada Lovelace"]') as HTMLButtonElement;
      expect(more).not.toBeNull();
      more.click();
      fixture.detectChanges();
      expect(sheet()).not.toBeNull();
    });

    it('selects a row on a tap in a selection table, with the sheet behind ⋯', () => {
      render(dataSource({ selectionMode: 'multi' }));
      const main = rows()[0].querySelector('div.cursor-pointer') as HTMLElement;
      main.click();
      fixture.detectChanges();

      expect(table().isSelected(MEMBERS[0])).toBeTrue();
      expect(sheet()).toBeNull();
      expect(rows()[0].querySelector('button[aria-haspopup="dialog"]')).not.toBeNull();
    });

    it('is not a button when a row has nothing more to show', () => {
      const source = dataSource();
      source.columns = source.columns.filter((c) => c.key === 'name' || c.key === 'email');
      render(source);
      expect(rows()[0].querySelector('button')).toBeNull();
    });

    it('labels the right-side value with its column name', () => {
      render(dataSource());
      expect(rows()[0].textContent).toContain('Member since');
    });

    it('leaves an empty or dash value off the row', () => {
      const source = dataSource({}, true);
      source.dataRows = new BehaviorSubject<Member[]>([{ ...MEMBERS[0], lanes: '-' }, MEMBERS[1]]);
      render(source);
      expect(rows()[0].textContent).not.toContain('- ');
      expect(rows()[0].querySelectorAll('.truncate').length).toBeLessThan(rows()[1].querySelectorAll('.truncate').length);
    });

    it('shows the full cell on a row, not the short cellSm form', () => {
      const source = dataSource();
      source.columns = source.columns.map((c) => c.key === 'name'
        ? { ...c, cellSm: { below: 'sm' as const, cell: (m: Member) => m.name.slice(0, 3) } }
        : c);
      render(source);
      expect(rows()[0].textContent).toContain('Ada Lovelace');
    });

    it('gives a row with its own click handler no ⋯ when it has no actions', () => {
      const source = dataSource({ onRowClick: () => undefined });
      source.columns = source.columns.filter((c) => !c.actions);
      render(source);
      expect(rows()[0].querySelector('button[aria-label^="Details for"]')).toBeNull();
    });

    it('hides search, the filter button and the pagination over a one-row list', () => {
      const source = dataSource({ paginationMode: 'client-side-pagination', pageSize: 10, canSearch: true });
      source.dataRows = new BehaviorSubject<Member[]>([MEMBERS[0]]);
      render(source);
      expect(fixture.nativeElement.querySelector('#mn-table-search')).toBeNull();
      expect(fixture.nativeElement.querySelector('button[aria-controls="mn-table-filters-panel"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('mn-collection-pagination')).toBeNull();
    });

    it('keeps search over a longer list', () => {
      render(dataSource({ canSearch: true }));
      expect(fixture.nativeElement.querySelector('#mn-table-search')).not.toBeNull();
    });

    it('leaves an empty value out of the sheet', () => {
      render(dataSource());
      (rows()[1].querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      const terms = Array.from(sheet()!.querySelectorAll('dt')).map((dt) => dt.textContent?.trim());
      // Alan Turing has no notes: the Notes row is left out.
      expect(terms).not.toContain('Notes');
    });
    it('leaves a value the column calls empty out of the sheet, label and all', () => {
      // What a template column does: its markup draws a placeholder the table cannot read.
      const source = dataSource();
      source.columns = source.columns.map((c) => c.key === 'notes' ? { ...c, isEmpty: (m: Member) => m.id === '1' } : c);
      render(source);
      const termsFor = (index: number) => {
        (rows()[index].querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement).click();
        fixture.detectChanges();
        return Array.from(sheet()!.querySelectorAll('dt')).map((dt) => dt.textContent?.trim());
      };
      // Ada's notes would read "Keyholder"; the column says there is nothing, so no Notes row.
      const terms = termsFor(0);
      expect(terms).not.toContain('Notes');
      expect(terms).toContain('Lanes');
    });

    it('offers sorting in the filter sheet, since the header row is gone', () => {
      render(dataSource());
      const filterButton = fixture.nativeElement.querySelector('button[aria-controls="mn-table-filters-panel"]') as HTMLButtonElement;
      expect(filterButton).not.toBeNull();
      filterButton.click();
      fixture.detectChanges();

      // One radio per sortable column plus "Default order", inline: no second sheet.
      const radios = Array.from(sheet()!.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
      expect(radios.length).toBe(3);
      expect(radios[0].checked).toBeTrue();
      expect(sheet()!.querySelector('mn-lib-select')).toBeNull();
      // The direction lives on the chosen column's row; the default order has none.
      const directionButton = () => sheet()!.querySelector('fieldset button[mnButton]') as HTMLButtonElement | null;
      expect(directionButton()).toBeNull();

      radios[1].click();
      fixture.detectChanges();
      expect(rows()[0].textContent).toContain('Ada Lovelace');
      expect(directionButton()?.textContent?.trim()).toBe('Ascending');

      directionButton()!.click();
      fixture.detectChanges();
      expect(rows()[0].textContent).toContain('Alan Turing');
      expect(directionButton()?.textContent?.trim()).toBe('Descending');
    });
  });

  describe('inside a modal', () => {
    beforeEach(() => setup(true));

    it('opens no sheet over the modal and keeps the actions in a ⋯ menu', () => {
      render(dataSource());
      expect(rows()[0].querySelector('button[aria-haspopup="dialog"]')).toBeNull();
      expect(rows()[0].querySelector('mn-lib-dropdown')).not.toBeNull();
    });
  });
});
