import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ModalBuilder } from '../builder/modal.builder';
import { MnFormBodyComponent } from '../components/mn-form-body/mn-form-body.component';
import {
  FieldKind,
  ModalKind,
  FormModalConfig,
  MultiSelectTableFieldConfig,
} from '../mn-modal.types';
import { TableDataSource, ColumnDefinition, ColumnSortType } from '../../mn-table/mn-table.types';

interface TestRow {
  id: string;
  name: string;
  email: string;
}

function createMockModalRef(): any {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: { subscribe: () => {} },
  };
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
    isDataLoading: false,
    canSearch: false,
  };
}

describe('Feature: Multi-Select Table Field', () => {
  let component: MnFormBodyComponent;
  let fixture: ComponentFixture<MnFormBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: FormModalConfig<any, any>) {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = createMockModalRef();
    fixture.detectChanges();
  }

  // === Builder Tests ===

  it('should include MULTI_SELECT_TABLE in FieldKind enum', () => {
    expect(FieldKind.MULTI_SELECT_TABLE).toBe('multi-select-table');
  });

  it('builder should accept MULTI_SELECT_TABLE field', () => {
    interface M { selected: string[]; }
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
    expect((config.fields[0] as any).tableDataSource).toBe(ds);
  });

  it('builder should preserve getRowValue function', () => {
    interface M { selected: string[]; }
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
    } as any);

    expect(component.form.contains('items')).toBeTrue();
  });

  it('should initialize form control with empty array', () => {
    const ds = createTestDataSource();
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds },
      ],
    } as any);

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
    } as any);

    expect(ds.selectionMode).toBe('multi');
  });

  it('should store table data source for template access', () => {
    const ds = createTestDataSource();
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds },
      ],
    } as any);

    expect(component.tableDataSources['items']).toBe(ds);
  });

  it('onTableSelectionChange should update form control with row IDs', () => {
    const ds = createTestDataSource();
    const field: any = {
      kind: FieldKind.MULTI_SELECT_TABLE,
      key: 'items',
      label: 'Items',
      tableDataSource: ds,
    };
    setup({
      kind: ModalKind.FORM,
      fields: [field],
    } as any);

    const selectedRows = [
      { id: '1', name: 'Alice', email: 'alice@test.com' },
      { id: '3', name: 'Charlie', email: 'charlie@test.com' },
    ];
    component.onTableSelectionChange(field, selectedRows);

    expect(component.form.get('items')!.value).toEqual(['1', '3']);
  });

  it('onTableSelectionChange should use custom getRowValue', () => {
    const ds = createTestDataSource();
    const field: any = {
      kind: FieldKind.MULTI_SELECT_TABLE,
      key: 'items',
      label: 'Items',
      tableDataSource: ds,
      getRowValue: (r: TestRow) => r.email,
    };
    setup({
      kind: ModalKind.FORM,
      fields: [field],
    } as any);

    const selectedRows = [
      { id: '1', name: 'Alice', email: 'alice@test.com' },
    ];
    component.onTableSelectionChange(field, selectedRows);

    expect(component.form.get('items')!.value).toEqual(['alice@test.com']);
  });

  it('onTableSelectionChange should mark control as touched', () => {
    const ds = createTestDataSource();
    const field: any = {
      kind: FieldKind.MULTI_SELECT_TABLE,
      key: 'items',
      label: 'Items',
      tableDataSource: ds,
    };
    setup({
      kind: ModalKind.FORM,
      fields: [field],
    } as any);

    expect(component.form.get('items')!.touched).toBeFalse();
    component.onTableSelectionChange(field, [{ id: '1', name: 'A', email: 'a@b.com' }]);
    expect(component.form.get('items')!.touched).toBeTrue();
  });

  it('should apply validators to MULTI_SELECT_TABLE field', () => {
    const ds = createTestDataSource();
    setup({
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds, validators: [Validators.required] },
      ],
    } as any);

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
    const config: any = {
      kind: ModalKind.FORM,
      fields: [
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds, validators: [Validators.required] },
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
    const field: any = {
      kind: FieldKind.MULTI_SELECT_TABLE,
      key: 'items',
      label: 'Items',
      tableDataSource: ds,
    };
    const config: any = {
      kind: ModalKind.FORM,
      fields: [field],
      onComplete: handler,
    };
    setup(config);

    // Simulate selection
    component.onTableSelectionChange(field, [
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
    } as any);

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
        { kind: FieldKind.MULTI_SELECT_TABLE, key: 'items', label: 'Items', tableDataSource: ds, visible: (f: any) => f.mode === 'b' },
      ],
    } as any);

    // Initially mode is null, so items should be hidden
    expect(component.fieldVisibility['items']).toBeFalse();

    // Set mode to 'b' — items should become visible
    component.form.get('mode')!.setValue('b');
    expect(component.fieldVisibility['items']).toBeTrue();
  });
});
