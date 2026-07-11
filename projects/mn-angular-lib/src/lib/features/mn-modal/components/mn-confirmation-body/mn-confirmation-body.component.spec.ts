import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {Validators} from '@angular/forms';
import {By} from '@angular/platform-browser';
import {LucideHeart, LucideTrash2} from '@lucide/angular';
import {
  ActionStyle,
  ConfirmationModalConfig,
  ConfirmationTone,
  FieldKind,
  MN_MODAL_ACTION_ICONS,
  MnConfirmationBodyComponent,
  MnModalRef,
  ModalCloseReason,
  ModalKind,
} from '../..';

function createMockModalRef(): MnModalRef<boolean> {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: { subscribe: () => {} },
  } as unknown as MnModalRef<boolean>;
}

describe('MnConfirmationBodyComponent', () => {
  let component: MnConfirmationBodyComponent<boolean>;
  let fixture: ComponentFixture<MnConfirmationBodyComponent<boolean>>;
  let mockModalRef: MnModalRef<boolean>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnConfirmationBodyComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  function setup(config: Partial<ConfirmationModalConfig> = {}) {
    fixture = TestBed.createComponent(MnConfirmationBodyComponent) as unknown as ComponentFixture<MnConfirmationBodyComponent<boolean>>;
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

  it('should disable confirm button if hybrid form is invalid', fakeAsync(() => {
    setup({
      fields: [
        {
          kind: FieldKind.TEXT,
          key: 'reason',
          label: 'Reason',
          validators: [Validators.required]
        }
      ]
    });
    tick(); // for initial status emit
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const confirmBtn = buttons[1];
    expect(confirmBtn.nativeElement.disabled).toBeTrue();

    // Fill the form
    component.formBody!.form.get('reason')!.setValue('Some reason');
    fixture.detectChanges();

    expect(component.confirmButtonStatus).toBe('VALID');
    fixture.detectChanges();

    expect(confirmBtn.nativeElement.disabled).toBeFalse();
  }));

  it('should enable confirm button immediately if no fields', () => {
    setup({ message: 'Just a message' });
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const confirmBtn = buttons[1];
    expect(confirmBtn.nativeElement.disabled).toBeFalse();
    expect(component.confirmButtonStatus).toBe('VALID');
  });

  describe('action icons', () => {
    it('defaults the confirm icon to check and the cancel icon to cross', () => {
      setup();
      expect(component.confirmIcon).toBe(MN_MODAL_ACTION_ICONS.confirm);
      expect(component.cancelIcon).toBe(MN_MODAL_ACTION_ICONS.cancel);
    });

    it('uses the trash icon for a DANGER-styled confirm button', () => {
      setup({confirm: {label: 'Delete', style: ActionStyle.DANGER}});
      expect(component.confirmIcon).toBe(MN_MODAL_ACTION_ICONS.danger);
    });

    it('lets a per-action icon override the default', () => {
      setup({
        confirm: {label: 'Yes', icon: LucideHeart.icon},
        cancel: {label: 'No', icon: LucideTrash2.icon},
      });
      expect(component.confirmIcon).toBe(LucideHeart.icon);
      expect(component.cancelIcon).toBe(LucideTrash2.icon);
    });

    it('renders a leading icon svg on each action button by default', () => {
      setup();
      const icons = fixture.debugElement.queryAll(By.css('button svg'));
      expect(icons.length).toBe(2);
    });

    it('renders no icons when showActionIcons is false', () => {
      setup({showActionIcons: false});
      expect(component.confirmIcon).toBeNull();
      expect(component.cancelIcon).toBeNull();
      const icons = fixture.debugElement.queryAll(By.css('button svg'));
      expect(icons.length).toBe(0);
    });
  });
});
