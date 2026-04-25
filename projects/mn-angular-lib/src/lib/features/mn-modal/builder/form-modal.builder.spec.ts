import { ModalBuilder } from './modal.builder';
import { FieldKind, FormLayoutMode, ModalKind, ModalSize, SubmitMode } from '../mn-modal.types';

interface TestModel {
  [key: string]: any;
}

describe('FormModalBuilder', () => {
  it('should create a config with correct kind', () => {
    const config = ModalBuilder.form<TestModel>().title('Test').field({
      kind: FieldKind.TEXT, key: 'name', label: 'Name',
    }).build();
    expect(config.kind).toBe(ModalKind.FORM);
    expect(config.fields.length).toBe(1);
  });

  it('should set title and size', () => {
    const config = ModalBuilder.form()
      .title('My Form')
      .size(ModalSize.LG)
      .build();
    expect(config.title).toBe('My Form');
    expect(config.size).toBe(ModalSize.LG);
  });

  it('should set layout, submitMode, and initialValue', () => {
    const config = ModalBuilder.form<{ name: string }>()
      .layout(FormLayoutMode.TWO_COLUMN)
      .submitMode(SubmitMode.RETRYABLE)
      .initialValue({ name: 'John' })
      .build();
    expect(config.layout).toBe(FormLayoutMode.TWO_COLUMN);
    expect(config.submitMode).toBe(SubmitMode.RETRYABLE);
    expect(config.initialValue).toEqual({ name: 'John' });
  });

  it('should add multiple fields', () => {
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .field({ kind: FieldKind.NUMBER, key: 'b', label: 'B' })
      .build();
    expect(config.fields.length).toBe(2);
    expect(config.fields[0].kind).toBe(FieldKind.TEXT);
    expect(config.fields[1].kind).toBe(FieldKind.NUMBER);
  });

  it('should create one row per field() call', () => {
    const config = ModalBuilder.form<TestModel>()
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .field({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .build();
    expect(config.rows!.length).toBe(2);
    expect(config.rows![0].columns).toBe(1);
    expect(config.rows![1].columns).toBe(1);
  });

  it('should flush pending row on build', () => {
    const config = ModalBuilder.form<TestModel>()
      .row(2)
      .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .build();
    expect(config.rows!.length).toBe(1);
    expect(config.rows![0].columns).toBe(2);
    expect(config.rows![0].fields.length).toBe(2);
  });

  it('should flush current row when field() is called', () => {
    const config = ModalBuilder.form<TestModel>()
      .row(2)
      .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .field({ kind: FieldKind.TEXT, key: 'c', label: 'C' })
      .build();
    expect(config.rows!.length).toBe(2);
    expect(config.rows![0].columns).toBe(2);
    expect(config.rows![1].columns).toBe(1);
  });

  it('should flush current row when a new row() is started', () => {
    const config = ModalBuilder.form<TestModel>()
      .row(2)
      .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .row(3)
      .addToRow({ kind: FieldKind.TEXT, key: 'c', label: 'C' })
      .addToRow({ kind: FieldKind.TEXT, key: 'd', label: 'D' })
      .addToRow({ kind: FieldKind.TEXT, key: 'e', label: 'E' })
      .build();
    expect(config.rows!.length).toBe(2);
    expect(config.rows![0].columns).toBe(2);
    expect(config.rows![1].columns).toBe(3);
  });

  it('should support span in addToRow', () => {
    const config = ModalBuilder.form<TestModel>()
      .row(3)
      .addToRow({ kind: FieldKind.TEXT, key: 'city', label: 'City' }, 2)
      .addToRow({ kind: FieldKind.TEXT, key: 'zip', label: 'ZIP' })
      .build();
    expect(config.rows![0].fields[0].span).toBe(2);
    expect(config.rows![0].fields[1].span).toBe(1);
  });

  it('should not flush an empty row', () => {
    const config = ModalBuilder.form<TestModel>()
      .row(2)
      .field({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .build();
    // row(2) had no addToRow calls, so it should not produce a row
    expect(config.rows!.length).toBe(1);
    expect(config.rows![0].columns).toBe(1);
  });

  it('should set onComplete handler', () => {
    const handler = { handle: async () => {} };
    const config = ModalBuilder.form()
      .onComplete(handler)
      .build();
    expect(config.onComplete).toBe(handler);
  });

  it('should freeze the config', () => {
    const config = ModalBuilder.form().build();
    expect(() => (config as any).title = 'x').toThrow();
  });

  it('should add fields to the flat fields array via addToRow', () => {
    const config = ModalBuilder.form<TestModel>()
      .row(2)
      .addToRow({ kind: FieldKind.TEXT, key: 'a', label: 'A' })
      .addToRow({ kind: FieldKind.TEXT, key: 'b', label: 'B' })
      .build();
    expect(config.fields.length).toBe(2);
  });

  it('should support declarative addRow', () => {
    const config = ModalBuilder.form<TestModel>()
      .addRow(2, (row) => {
        row.add({ kind: FieldKind.TEXT, key: 'first', label: 'First' });
        row.add({ kind: FieldKind.TEXT, key: 'last', label: 'Last' }, 2);
      })
      .build();

    expect(config.rows!.length).toBe(1);
    expect(config.rows![0].columns).toBe(2);
    expect(config.rows![0].fields.length).toBe(2);
    expect(config.rows![0].fields[0].field.key).toBe('first');
    expect(config.rows![0].fields[1].span).toBe(2);
    expect(config.fields.length).toBe(2);
  });

  it('should support declarative fieldGroup', () => {
    const config = ModalBuilder.form<TestModel>()
      .fieldGroup('Identity', (g) => {
        g.row(2)
          .addToRow({ kind: FieldKind.TEXT, key: 'first', label: 'First' })
          .addToRow({ kind: FieldKind.TEXT, key: 'last', label: 'Last' });
      })
      .build();

    expect(config.fieldGroups!.length).toBe(1);
    expect(config.fieldGroups![0].title).toBe('Identity');
    expect(config.fieldGroups![0].fields.length).toBe(2);
    expect(config.fieldGroups![0].rows!.length).toBe(1);
    expect(config.fieldGroups![0].rows![0].columns).toBe(2);
    expect(config.fields.length).toBe(2);
  });

  it('should support body() in form', () => {
    const config = ModalBuilder.form()
      .body('Hello World')
      .build();
    expect(config.body).toBe('Hello World');
  });
});
