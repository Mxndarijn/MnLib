import { ModalBuilder } from './modal.builder';
import {
  BackdropMode,
  CloseMode,
  KeyboardMode,
  ModalIntent,
  ModalKind,
  ModalSize,
} from '../mn-modal.types';

describe('BaseModalBuilder (via FormModalBuilder)', () => {
  it('should default size to undefined', () => {
    const config = ModalBuilder.form().build();
    expect(config.size).toBeUndefined();
  });

  it('should default title to undefined', () => {
    const config = ModalBuilder.form().build();
    expect(config.title).toBeUndefined();
  });

  it('should set closeMode', () => {
    const config = ModalBuilder.form()
      .closeMode(CloseMode.DISABLED)
      .build();
    expect(config.closeMode).toBe(CloseMode.DISABLED);
  });

  it('should set backdrop', () => {
    const config = ModalBuilder.form()
      .backdrop(BackdropMode.STATIC)
      .build();
    expect(config.backdrop).toBe(BackdropMode.STATIC);
  });

  it('should set keyboard', () => {
    const config = ModalBuilder.form()
      .keyboard(KeyboardMode.DISABLED)
      .build();
    expect(config.keyboard).toBe(KeyboardMode.DISABLED);
  });

  it('should set intent', () => {
    const config = ModalBuilder.form()
      .intent(ModalIntent.DANGER)
      .build();
    expect(config.intent).toBe(ModalIntent.DANGER);
  });

  it('should support method chaining', () => {
    const config = ModalBuilder.form()
      .title('Chained')
      .sizeWidth(ModalSize.XL)
      .closeMode(CloseMode.GUARDED)
      .backdrop(BackdropMode.CLOSABLE)
      .keyboard(KeyboardMode.ENABLED)
      .intent(ModalIntent.WARNING)
      .build();
    expect(config.title).toBe('Chained');
    expect(config.size).toBe(ModalSize.XL);
    expect(config.closeMode).toBe(CloseMode.GUARDED);
    expect(config.backdrop).toBe(BackdropMode.CLOSABLE);
    expect(config.keyboard).toBe(KeyboardMode.ENABLED);
    expect(config.intent).toBe(ModalIntent.WARNING);
  });

  it('build() should freeze the object (shallow)', () => {
    const config = ModalBuilder.form().build();
    expect(Object.isFrozen(config)).toBeTrue();
  });

  it('build() should return a new object each time', () => {
    const builder = ModalBuilder.form().title('Test');
    const config1 = builder.build();
    const config2 = builder.build();
    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });

  it('should set custom component, template, and inputs', () => {
    const mockComponent = {} as any;
    const mockTemplate = {} as any;
    const mockInputs = { key: 'value' };

    const config = ModalBuilder.form()
      .component(mockComponent)
      .template(mockTemplate)
      .inputs(mockInputs)
      .build();

    expect(config.component).toBe(mockComponent);
    expect(config.template).toBe(mockTemplate);
    expect(config.inputs).toEqual(mockInputs);
  });
});
