import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MnConfirmationBodyComponent } from './mn-confirmation-body.component';
import {
  ActionStyle,
  ConfirmationModalConfig,
  ConfirmationTone,
  ModalCloseReason,
  ModalKind,
} from '../../mn-modal.types';

function createMockModalRef(): any {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: { subscribe: () => {} },
  };
}

describe('MnConfirmationBodyComponent', () => {
  let component: MnConfirmationBodyComponent<any>;
  let fixture: ComponentFixture<MnConfirmationBodyComponent<any>>;
  let mockModalRef: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnConfirmationBodyComponent],
    }).compileComponents();
  });

  function setup(config: Partial<ConfirmationModalConfig> = {}) {
    fixture = TestBed.createComponent(MnConfirmationBodyComponent);
    component = fixture.componentInstance;
    mockModalRef = createMockModalRef();
    component.config = {
      kind: ModalKind.CONFIRMATION,
      message: 'Are you sure?',
      ...config,
    } as ConfirmationModalConfig;
    component.modalRef = mockModalRef;
    fixture.detectChanges();
  }

  it('should display the message', () => {
    setup({ message: 'Delete this item?' });
    expect(component.config.message).toBe('Delete this item?');
  });

  it('confirm() should close with COMPLETED reason', async () => {
    setup();
    await component.confirm();
    expect(mockModalRef.close).toHaveBeenCalledWith(true);
  });

  it('cancel() should dismiss with CANCELLED reason', () => {
    setup();
    component.cancel();
    expect(mockModalRef.dismiss).toHaveBeenCalledWith(ModalCloseReason.CANCELLED);
  });

  it('cancel() should use custom reason when provided', () => {
    setup({
      cancel: {
        label: 'Nope',
        reason: ModalCloseReason.DISMISSED,
      },
    });
    component.cancel();
    expect(mockModalRef.dismiss).toHaveBeenCalledWith(ModalCloseReason.DISMISSED);
  });

  it('confirm() should call confirm handler if provided', async () => {
    const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
    setup({
      confirm: { label: 'Yes', handler },
    });
    await component.confirm();
    expect(handler.handle).toHaveBeenCalledWith(true);
  });

  it('should return correct confirm label', () => {
    setup({ confirm: { label: 'Delete' } });
    expect(component.confirmLabel).toBe('Delete');
  });

  it('should return default confirm label when not set', () => {
    setup();
    expect(component.confirmLabel).toBe('Confirm');
  });

  it('should return correct cancel label', () => {
    setup({ cancel: { label: 'Keep' } });
    expect(component.cancelLabel).toBe('Keep');
  });

  it('should return default cancel label when not set', () => {
    setup();
    expect(component.cancelLabel).toBe('Cancel');
  });

  it('should return correct tone class for DANGER', () => {
    setup({ tone: ConfirmationTone.DANGER });
    expect(component.toneClass).toBe('tone-danger');
  });

  it('should return correct tone class for WARNING', () => {
    setup({ tone: ConfirmationTone.WARNING });
    expect(component.toneClass).toBe('tone-warning');
  });

  it('should return default tone class', () => {
    setup({ tone: ConfirmationTone.DEFAULT });
    expect(component.toneClass).toBe('tone-default');
  });

  it('should map ActionStyle to button color correctly', () => {
    setup();
    expect(component.getButtonColor(ActionStyle.PRIMARY)).toBe('primary');
    expect(component.getButtonColor(ActionStyle.DANGER)).toBe('danger');
    expect(component.getButtonColor(ActionStyle.GHOST)).toBe('secondary');
    expect(component.getButtonColor(ActionStyle.SECONDARY)).toBe('secondary');
  });

  it('should map ActionStyle to button variant correctly', () => {
    setup();
    expect(component.getButtonVariant(ActionStyle.PRIMARY)).toBe('fill');
    expect(component.getButtonVariant(ActionStyle.DANGER)).toBe('fill');
    expect(component.getButtonVariant(ActionStyle.GHOST)).toBe('text');
    expect(component.getButtonVariant(ActionStyle.SECONDARY)).toBe('outline');
  });
});
