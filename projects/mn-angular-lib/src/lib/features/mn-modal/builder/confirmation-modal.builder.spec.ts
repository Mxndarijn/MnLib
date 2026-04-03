import { ModalBuilder } from './modal.builder';
import {
  ActionStyle,
  ConfirmationTone,
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
});
