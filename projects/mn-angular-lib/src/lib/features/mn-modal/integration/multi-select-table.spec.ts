import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Validators} from '@angular/forms';
import {BehaviorSubject} from 'rxjs';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ModalBuilder} from '../builder';
import {
  FieldKind,
  FormFieldConfig,
  FormModalConfig,
  MnFormBodyComponent,
  ModalKind,
  ModalRef,
  MultiSelectTableFieldConfig,
} from '..';
import {ColumnSortType, TableDataSource} from '../../mn-table';

type TestRow = {
  id: string;
  name: string;
  email: string;
}

function createMockModalRef(): ModalRef<unknown> {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: { subscribe: () => {} },
    update: jasmine.createSpy('update'),
  } as unknown as ModalRef<unknown>;
}

function createTestDataSource(rows?: TestRow[]): TableDataSource<TestRow> {
  const data = rows || [
    { id: '1', name: 'Alice', email: 'alice@test.com' },
    { id: '2', name: 'Bob', email: 'bob@test.com' },
    { id: '3', name: 'Charlie', email: 'charlie@test.com' },
  ];
  return {
    dataRows: new BehaviorSubject<TestRow[]>(data),
    columns: [
      { key: 'name', header: 'Name', cell: (r: TestRow) => r.name, sortType: ColumnSortType.ALPHABETICAL },
      { key: 'email', header: 'Email', cell: (r: TestRow) => r.email },
    ],
    getID: (r: TestRow) => r.id,
    emptyMessage: 'No rows',
    canSearch: false,
  };
}

type ItemsModel = { items: string[] };
type ItemsNameModel = { name: string; items: string[] };
type ModeItemsModel = { mode: string; items: string[] };

describe('Feature: Multi-Select Table Field', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup<TModel, TResult = TModel>(config: Readonly<FormModalConfig<TModel, TResult>>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    component.config = config as unknown as FormModalConfig<unknown>;
    component.modalRef = createMockModalRef() as unknown as typeof component.modalRef;
    fixture.detectChanges();
  }

  // === Builder Tests ===

  it('should include MULTI_SELECT_TABLE in FieldKind enum', () => {
    expect(FieldKind.MULTI_SELECT_TABLE).toBe('multi-select-table');
  });

  it('builder should accept MULTI_SELECT_TABLE field', () => {
    type M = { selected: string[]; }
    const ds = createTestDataSource();
    const config = ModalBuilder.form<M>()
      .field({
        kind: FieldKind.MULTI_SELECT_TABLE,
        key: 'selected',
        label: 'Select Items',
        tableDataSource: ds,
      })
      .build();

    expect(config.fields.length).toBe(1);
    expect(config.fields[0].kind).toBe(FieldKind.MULTI_SELECT_TABLE);
    expect((config.fields[0] as MultiSelectTableFieldConfig<M, TestRow>).tableDataSource).toBe(ds);
  });

  it('builder should preserve getRowValue function', () => {
    type M = { selected: string[]; }
    const ds = createTestDataSource();
    const getVal = (r: TestRow) => r.email;
    const config = ModalBuilder.form<M>()
      .field({
        kind: FieldKind.MULTI_SELECT_TABLE,
        key: 'selected',
        label: 'Select',
        tableDataSource: ds,
        getRowValue: getVal,
      })
      .build();

    expect((config.fields[0] as MultiSelectTableFieldConfig).getRowValue).toBe(getVal);
  });

  // === Component Tests ===

  it('should create form control for MULTI_SELECT_TABLE field', () => {
    const ds = createTestDataSource();
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds },
      ],
    } as FormModalConfig<ItemsModel, unknown>);

    expect(component.form.contains('items')).toBeTrue();
  });

  it('should initialize form control with empty array', () => {
    const ds = createTestDataSource();
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds },
      ],
    } as FormModalConfig<ItemsModel, unknown>);

    expect(component.form.get('items')!.value).toEqual([]);
  });

  it('should force selectionMode to multi on the data source', () => {
    const ds = createTestDataSource();
    ds.selectionMode = 'none';
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds },
      ],
    } as FormModalConfig<ItemsModel, unknown>);

    expect(ds.selectionMode).toBe('multi');
  });

  it('should store table data source for template access', () => {
    const ds = createTestDataSource();
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds },
      ],
    } as FormModalConfig<ItemsModel, unknown>);

    expect(component.tableDataSources['items']).toBe(ds);
  });

  /**
   * Editing an existing record must open with the rows it already references
   * ticked. Exercises the whole path: the field's initial value seeds
   * `initialSelectedIds` on the data source, which mn-table turns into checked
   * checkboxes and re-emits as the control's value.
   */
  it('pre-selects the rows named by the field initial value', () => {
    const dataSource = createTestDataSource();
    setup<ItemsModel>(
      ModalBuilder.form<ItemsModel, ItemsModel>()
        .title('Edit')
        .initialValue({items: ['1', '3']})
        .field({
          kind: FieldKind.MULTI_SELECT_TABLE,
          key: 'items',
          label: 'Items',
          tableDataSource: dataSource as unknown as TableDataSource<unknown>,
          getRowValue: (row: unknown) => (row as TestRow).id,
        })
        .build(),
    );

    // The data source carries the ids through to the table...
    expect(dataSource.initialSelectedIds).toEqual(['1', '3']);

    // ...and the table ticks exactly those rows.
    const boxes: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('tbody input[type="checkbox"]'),
    );
    expect(boxes.length).toBe(3);
    const checkedNames = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>,
    )
      .filter((row) => row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked)
      .map((row) => row.querySelector('td:nth-child(2)')?.textContent?.trim());
    expect(checkedNames).toEqual(['Alice', 'Charlie']);

    // ...and the control still holds them, so submitting without touching the
    // table keeps the existing selection rather than clearing it.
    expect(component.form.get('items')?.value).toEqual(['1', '3']);
  });

  /**
   * The rows often arrive after the table initialises (any server fetch). The
   * initial value must survive that: seeding selection while `dataRows` is still
   * empty must not report "nothing selected" back into the form and wipe it.
   */
  it('keeps the initial value when the rows load after init', async () => {
    const rows = new BehaviorSubject<TestRow[]>([]);
    const dataSource: TableDataSource<TestRow> = {
      ...createTestDataSource(),
      dataRows: rows,
    };
    setup<ItemsModel>(
      ModalBuilder.form<ItemsModel, ItemsModel>()
        .title('Edit')
        .initialValue({items: ['1', '3']})
        .field({
          kind: FieldKind.MULTI_SELECT_TABLE,
          key: 'items',
          label: 'Items',
          tableDataSource: dataSource as unknown as TableDataSource<unknown>,
          getRowValue: (row: unknown) => (row as TestRow).id,
        })
        .build(),
    );

    // Rows land later, exactly as a fetch would deliver them.
    rows.next([
      {id: '1', name: 'Alice', email: 'alice@test.com'},
      {id: '2', name: 'Bob', email: 'bob@test.com'},
      {id: '3', name: 'Charlie', email: 'charlie@test.com'},
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const checkedNames = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>,
    )
      .filter((row) => row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked)
      .map((row) => row.querySelector('td:nth-child(2)')?.textContent?.trim());
    expect(checkedNames).toEqual(['Alice', 'Charlie']);
    expect(component.form.get('items')?.value).toEqual(['1', '3']);
  });

  /**
   * Row order is the data source's to decide, and selection is not a sort key.
   * A consumer that hands the rows over in a deliberate order (groups before
   * members, most-recent first) must get that order back on screen, whether the
   * table opened with a selection or not — otherwise the ordering it built is
   * silently overruled by however many rows happen to be ticked.
   */
  it('renders the rows in source order regardless of the initial selection', () => {
    setup<ItemsModel>(
      ModalBuilder.form<ItemsModel, ItemsModel>()
        .title('Edit')
        .initialValue({items: ['3']})
        .field({
          kind: FieldKind.MULTI_SELECT_TABLE,
          key: 'items',
          label: 'Items',
          tableDataSource: createTestDataSource() as unknown as TableDataSource<unknown>,
          getRowValue: (row: unknown) => (row as TestRow).id,
        })
        .build(),
    );

    const names = (): string[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll('tbody tr td:nth-child(2)') as NodeListOf<HTMLElement>,
      ).map((cell) => cell.textContent?.trim() ?? '');

    // Charlie is id 3 and arrives selected, but stays last where the source put it.
    expect(names()).toEqual(['Alice', 'Bob', 'Charlie']);

    // Ticking a row must not move it either — a row leaping mid-click drags the
    // next row under the pointer.
    const boxes: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('tbody input[type="checkbox"]'),
    );
    boxes[2].click();
    fixture.detectChanges();
    expect(names()).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('leaves the order alone when nothing arrived selected', () => {
    setup<ItemsModel>(
      ModalBuilder.form<ItemsModel, ItemsModel>()
        .title('Create')
        .field({
          kind: FieldKind.MULTI_SELECT_TABLE,
          key: 'items',
          label: 'Items',
          tableDataSource: createTestDataSource() as unknown as TableDataSource<unknown>,
          getRowValue: (row: unknown) => (row as TestRow).id,
        })
        .build(),
    );

    const names = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr td:nth-child(2)') as NodeListOf<HTMLElement>,
    ).map((cell) => cell.textContent?.trim());
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  /**
   * A table used as a form field is always inside a modal, where it is short, paged
   * and searched — so its selection is the thing most likely to scroll out of view.
   * The summary is therefore on unless a field opts out.
   */
  it('turns the selection summary on by default for a table field', () => {
    const dataSource = createTestDataSource();
    setup<ItemsModel>(
      ModalBuilder.form<ItemsModel, ItemsModel>()
        .title('Pick')
        .field({
          kind: FieldKind.MULTI_SELECT_TABLE,
          key: 'items',
          label: 'Items',
          tableDataSource: dataSource as unknown as TableDataSource<unknown>,
          getRowValue: (row: unknown) => (row as TestRow).id,
        })
        .build(),
    );

    expect(dataSource.selectionSummary).toBeTrue();
  });

  it('lets a field opt out of the selection summary', () => {
    const dataSource = {...createTestDataSource(), selectionSummary: false};
    setup<ItemsModel>(
      ModalBuilder.form<ItemsModel, ItemsModel>()
        .title('Pick')
        .field({
          kind: FieldKind.MULTI_SELECT_TABLE,
          key: 'items',
          label: 'Items',
          tableDataSource: dataSource as unknown as TableDataSource<unknown>,
          getRowValue: (row: unknown) => (row as TestRow).id,
        })
        .build(),
    );

    expect(dataSource.selectionSummary).toBeFalse();
  });

  it('onTableSelectionChange should update form control with row IDs', () => {
    const ds = createTestDataSource();
    const field: MultiSelectTableFieldConfig<ItemsModel, TestRow> = {
      kind: FieldKind.MULTI_SELECT_TABLE,
      key: 'items',
      label: 'Items',
      tableDataSource: ds,
    };
    setup({
      kind: ModalKind.FORM,
      fields: [field],
    } as FormModalConfig<ItemsModel, unknown>);

    const selectedRows = [
      { id: '1', name: 'Alice', email: 'alice@test.com' },
      { id: '3', name: 'Charlie', email: 'charlie@test.com' },
    ];
    component.onTableSelectionChange(field as unknown as FormFieldConfig<unknown>, selectedRows);

    expect(component.form.get('items')!.value).toEqual(['1', '3']);
  });

  it('onTableSelectionChange should use custom getRowValue', () => {
    const ds = createTestDataSource();
    const field: MultiSelectTableFieldConfig<ItemsModel, TestRow> = {
      kind: FieldKind.MULTI_SELECT_TABLE,
      key: 'items',
      label: 'Items',
      tableDataSource: ds,
      getRowValue: (r: TestRow) => r.email,
    };
    setup({
      kind: ModalKind.FORM,
      fields: [field],
    } as FormModalConfig<ItemsModel, unknown>);

    const selectedRows = [
      { id: '1', name: 'Alice', email: 'alice@test.com' },
    ];
    component.onTableSelectionChange(field as unknown as FormFieldConfig<unknown>, selectedRows);

    expect(component.form.get('items')!.value).toEqual(['alice@test.com']);
  });

  it('onTableSelectionChange should mark control as touched', () => {
    const ds = createTestDataSource();
    const field: MultiSelectTableFieldConfig<ItemsModel, TestRow> = {
      kind: FieldKind.MULTI_SELECT_TABLE,
      key: 'items',
      label: 'Items',
      tableDataSource: ds,
    };
    setup({
      kind: ModalKind.FORM,
      fields: [field],
    } as FormModalConfig<ItemsModel, unknown>);

    expect(component.form.get('items')!.touched).toBeFalse();
    component.onTableSelectionChange(field as unknown as FormFieldConfig<unknown>, [{
      id: '1',
      name: 'A',
      email: 'a@b.com'
    }]);
    expect(component.form.get('items')!.touched).toBeTrue();
  });

  it('should apply validators to MULTI_SELECT_TABLE field', () => {
    const ds = createTestDataSource();
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds, validators: [Validators.required] },
      ],
    } as FormModalConfig<ItemsModel, unknown>);

    // Empty array should be invalid with required validator
    // Note: Validators.required considers [] as valid (non-null), so we test with null
    const control = component.form.get('items')!;
    control.setValue(null);
    expect(control.valid).toBeFalse();
    control.setValue(['1']);
    expect(control.valid).toBeTrue();
  });

  it('should block submit when required MULTI_SELECT_TABLE is empty (null)', async () => {
    const ds = createTestDataSource();
    const handler = { handle: jasmine.createSpy('handle') };
    const config: FormModalConfig<ItemsModel, unknown> = {
      kind: ModalKind.FORM,
      fields: [
        {
          kind: FieldKind.MULTI_SELECT_TABLE,
          key: 'items',
          label: 'Items',
          tableDataSource: ds as unknown as TableDataSource<unknown>,
          validators: [Validators.required]
        },
      ],
      onComplete: handler,
    };
    setup(config);

    // Set to null to trigger required
    component.form.get('items')!.setValue(null);
    await component.submit();

    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('should submit successfully with selected table rows', async () => {
    const ds = createTestDataSource();
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    const field: MultiSelectTableFieldConfig<ItemsModel, TestRow> = {
      kind: FieldKind.MULTI_SELECT_TABLE,
      key: 'items',
      label: 'Items',
      tableDataSource: ds,
    };
    const config: FormModalConfig<ItemsModel, unknown> = {
      kind: ModalKind.FORM,
      fields: [field as unknown as FormFieldConfig<ItemsModel>],
      onComplete: handler,
    };
    setup(config);

    // Simulate selection
    component.onTableSelectionChange(field as unknown as FormFieldConfig<unknown>, [
      { id: '1', name: 'Alice', email: 'alice@test.com' },
      { id: '2', name: 'Bob', email: 'bob@test.com' },
    ]);

    await component.submit();

    expect(handler.handle).toHaveBeenCalledWith(jasmine.objectContaining({ items: ['1', '2'] }));
  });

  it('should work alongside other field types', () => {
    const ds = createTestDataSource();
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.TEXT, key: 'name', label: 'Name', validators: [Validators.required] },
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds },
      ],
    } as FormModalConfig<ItemsNameModel, unknown>);

    expect(component.form.contains('name')).toBeTrue();
    expect(component.form.contains('items')).toBeTrue();
    expect(component.form.get('items')!.value).toEqual([]);
  });

  it('should support visible condition on MULTI_SELECT_TABLE field', () => {
    const ds = createTestDataSource();
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.SELECT, key: 'mode', label: 'Mode', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
        {
          kind: FieldKind.MULTI_SELECT_TABLE,
          key: 'items',
          label: 'Items',
          tableDataSource: ds,
          visible: (f: Partial<ModeItemsModel>) => f.mode === 'b'
        },
      ],
    } as FormModalConfig<ModeItemsModel, unknown>);

    // Initially mode is null, so items should be hidden
    expect(component.fieldVisibility['items']).toBeFalse();

    // Set mode to 'b' — items should become visible
    component.form.get('mode')!.setValue('b');
    expect(component.fieldVisibility['items']).toBeTrue();
  });
});
