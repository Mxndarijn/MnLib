import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {BehaviorSubject} from 'rxjs';
import {LucidePencil, LucideTrash2} from '@lucide/angular';
import {ColumnDefinition, MnTable, MnTableRowAction, TableDataSource} from 'mn-angular-lib';

/** Minimal row shape used by the actions-column tests. */
type Row = {
  id: string;
  name: string;
  active: boolean;
};

/**
 * Covers an actions column's behaviour contract: which actions a row actually gets
 * ({@link MnTableRowAction.hidden}), how they are presented, and the two ways a caller
 * can declare presentation — fixed for the whole column, or derived per row.
 *
 * The per-row form is the interesting one: it is what lets a single action cover a
 * state that flips (activate/deactivate) instead of two `hidden`-gated twins, so the
 * tests assert on the *rendered* label/colour rather than on the config object.
 */
describe('MnTable row actions', () => {
  let fixture: ComponentFixture<MnTable<Row>>;
  let rows: BehaviorSubject<Row[]>;

  /** The two rows every test renders: one active, one not. */
  const DATA: Row[] = [
    {id: '1', name: 'Alpha', active: true},
    {id: '2', name: 'Beta', active: false},
  ];

  /**
   * Builds a data source whose second column is an actions column.
   * @param actions The row actions under test.
   * @param overrides Extra column settings (e.g. `actionsInline`).
   */
  function makeDataSource(
    actions: MnTableRowAction<Row>[],
    overrides: Partial<ColumnDefinition<Row>> = {},
  ): TableDataSource<Row> {
    return {
      dataRows: rows,
      getID: (row) => row.id,
      columns: [
        {key: 'name', header: 'Name', cell: (row) => row.name},
        {key: 'actions', header: 'Actions', actions, ...overrides} as ColumnDefinition<Row>,
      ],
      emptyMessage: 'No items',
      canSearch: false,
    };
  }

  /** Renders the given actions and returns the inline action buttons, in DOM order. */
  function renderActions(
    actions: MnTableRowAction<Row>[],
    overrides: Partial<ColumnDefinition<Row>> = {},
  ): HTMLButtonElement[] {
    fixture.componentInstance.dataSource = makeDataSource(actions, overrides);
    fixture.detectChanges();
    // Every action row also renders the collapsed ⋯ trigger (itself a button[mnButton]);
    // exclude it so these assert on the inline action buttons.
    return Array.from(
      fixture.nativeElement.querySelectorAll('tbody button[mnButton]:not(mn-lib-dropdown *)'),
    ) as HTMLButtonElement[];
  }

  beforeEach(async () => {
    rows = new BehaviorSubject<Row[]>(DATA);
    await TestBed.configureTestingModule({
      imports: [MnTable],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(MnTable<Row>);
  });

  it('drops an action only for the rows its hidden predicate rejects', () => {
    const buttons = renderActions([
      {label: 'Deactivate', hidden: (row) => !row.active, run: () => undefined},
      {label: 'Delete', run: () => undefined},
    ]);

    // Row 1 (active) gets both; row 2 gets only Delete — three buttons, not four.
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      'Deactivate',
      'Delete',
      'Delete',
    ]);
  });

  it('leaves a row cell empty when every action is hidden for it', () => {
    renderActions([{label: 'Delete', hidden: (row) => !row.active, run: () => undefined}]);

    const actionCells = fixture.nativeElement.querySelectorAll('tbody tr td:nth-child(2)');
    expect(actionCells[0].textContent.trim()).toBe('Delete');
    expect(actionCells[1].textContent.trim()).toBe('');
  });

  it('derives label and colour per row so one action can cover a flipped state', () => {
    const buttons = renderActions([
      {
        label: (row) => (row.active ? 'Deactivate' : 'Activate'),
        color: (row) => (row.active ? 'success' : 'danger'),
        run: () => undefined,
      },
    ]);

    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent?.trim()).toBe('Deactivate');
    expect(buttons[1].textContent?.trim()).toBe('Activate');
    // The two rows must not share a colour, else the derived form silently collapsed.
    expect(buttons[0].className).not.toBe(buttons[1].className);
  });

  it('renders a lucide data icon without the caller owning a template', () => {
    renderActions([{label: 'Edit', icon: LucidePencil.icon, run: () => undefined}]);

    const svgs = fixture.nativeElement.querySelectorAll('tbody button[mnButton]:not(mn-lib-dropdown *) svg');
    expect(svgs.length).toBe(2);
    // Rendered from the data, not an empty placeholder: the glyph has real geometry.
    expect(svgs[0].innerHTML.trim().length).toBeGreaterThan(0);
  });

  it('derives the icon per row', () => {
    renderActions([
      {
        label: 'Toggle',
        icon: (row) => (row.active ? LucideTrash2.icon : LucidePencil.icon),
        run: () => undefined,
      },
    ]);

    const svgs = fixture.nativeElement.querySelectorAll('tbody button[mnButton]:not(mn-lib-dropdown *) svg');
    expect(svgs.length).toBe(2);
    expect(svgs[0].innerHTML).not.toBe(svgs[1].innerHTML);
  });

  it("keeps the label as the accessible name and tooltip in 'icon' mode", () => {
    const buttons = renderActions(
      [{label: 'Edit', icon: LucidePencil.icon, run: () => undefined}],
      {actionsInline: 'icon'},
    );

    expect(buttons[0].getAttribute('aria-label')).toBe('Edit');
    expect(buttons[0].getAttribute('title')).toBe('Edit');
    expect(buttons[0].textContent?.trim()).toBe('');
  });

  it("still shows the text in 'icon' mode when an action has no icon, so it is never blank", () => {
    const buttons = renderActions([{label: 'Edit', run: () => undefined}], {
      actionsInline: 'icon',
    });

    expect(buttons[0].textContent?.trim()).toBe('Edit');
  });

  it('invokes run with the row the action was chosen on', () => {
    const chosen: Row[] = [];
    const buttons = renderActions([{label: 'Delete', run: (row) => chosen.push(row)}]);

    buttons[1].click();

    expect(chosen).toEqual([DATA[1]]);
  });

  it('disables an action per row without hiding it', () => {
    const buttons = renderActions([
      {label: 'Delete', disabled: (row) => row.active, run: () => undefined},
    ]);

    expect(buttons.length).toBe(2);
    expect(buttons[0].disabled).toBeTrue();
    expect(buttons[1].disabled).toBeFalse();
  });
});
