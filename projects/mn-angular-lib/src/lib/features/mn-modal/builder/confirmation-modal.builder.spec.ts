import { ModalBuilder } from './modal.builder';
import {
  ActionStyle,
  ConfirmationTone,
  FieldKind,
  ModalCloseReason,
  ModalKind,
  ModalSize,
} from '../mn-modal.types';

describe('ConfirmationModalBuilder', () => {
  it('should create a config with correct kind', () => {
    const config = ModalBuilder.confirmation()
      .message('Sure?')
      .build();
    expect(config.kind).toBe(ModalKind.CONFIRMATION);
  });

  it('should set message', () => {
    const config = ModalBuilder.confirmation()
      .message('Are you sure?')
      .build();
    expect(config.message).toBe('Are you sure?');
  });

  it('should set tone', () => {
    const config = ModalBuilder.confirmation()
      .message('Delete?')
      .tone(ConfirmationTone.DANGER)
      .build();
    expect(config.tone).toBe(ConfirmationTone.DANGER);
  });

  it('should set confirm action', () => {
    const config = ModalBuilder.confirmation()
      .message('Proceed?')
      .confirmAction({
        label: 'Yes',
        style: ActionStyle.PRIMARY,
      })
      .build();
    expect(config.confirm!.label).toBe('Yes');
    expect(config.confirm!.style).toBe(ActionStyle.PRIMARY);
  });

  it('should set cancel action', () => {
    const config = ModalBuilder.confirmation()
      .message('Proceed?')
      .cancelAction({
        label: 'No',
        style: ActionStyle.SECONDARY,
        reason: ModalCloseReason.CANCELLED,
      })
      .build();
    expect(config.cancel!.label).toBe('No');
    expect(config.cancel!.style).toBe(ActionStyle.SECONDARY);
    expect(config.cancel!.reason).toBe(ModalCloseReason.CANCELLED);
  });

  it('should set confirm action with handler', () => {
    const handler = { handle: async () => {} };
    const config = ModalBuilder.confirmation()
      .message('OK?')
      .confirmAction({
        label: 'Confirm',
        handler,
      })
      .build();
    expect(config.confirm!.handler).toBe(handler);
  });

  it('should set title and size from base builder', () => {
    const config = ModalBuilder.confirmation()
      .title('Confirm Delete')
      .size(ModalSize.SM)
      .message('Delete this item?')
      .build();
    expect(config.title).toBe('Confirm Delete');
    expect(config.size).toBe(ModalSize.SM);
  });

  it('should freeze the config', () => {
    const config = ModalBuilder.confirmation()
      .message('Test')
      .build();
    expect(() => (config as any).message = 'changed').toThrow();
  });

  it('should default message to empty string', () => {
    const config = ModalBuilder.confirmation().build();
    expect(config.message).toBe('');
  });

  it('should support fields and rows (Hybrid Confirmation)', () => {
    const config = ModalBuilder.confirmation()
      .message('Hybrid')
      .field({ kind: FieldKind.TEXT, key: 'reason', label: 'Reason' })
      .addRow(2, (row) => {
        row.add({ kind: FieldKind.CHECKBOX, key: 'ok', label: 'OK' });
      })
      .build();

    expect(config.fields!.length).toBe(2);
    expect(config.rows!.length).toBe(2);
    expect(config.fields![0].key).toBe('reason');
    expect(config.fields![1].key).toBe('ok');
  });

  it('should support body()', () => {
    const config = ModalBuilder.confirmation()
      .body('Custom Body')
      .build();
    expect(config.body).toBe('Custom Body');
  });

  it('should support fieldGroup()', () => {
    const config = ModalBuilder.confirmation()
      .fieldGroup('Options', (g) => {
        g.field({ kind: FieldKind.TEXT, key: 'opt1', label: 'Option 1' });
      })
      .build();

    expect(config.fieldGroups!.length).toBe(1);
    expect(config.fieldGroups![0].title).toBe('Options');
    expect(config.fieldGroups![0].fields.length).toBe(1);
  });
});
