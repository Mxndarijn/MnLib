import {ChangeDetectorRef, Component, inject, Input, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {MnModalRef} from '../../mn-modal-ref';
import {ActionStyle, ConfirmationModalConfig, ConfirmationTone, ModalCloseReason,} from '../../mn-modal.types';
import {MnButton} from '../../../mn-button';
import {MnFormBodyComponent} from '../mn-form-body/mn-form-body.component';
import {MnCustomBodyHostComponent} from '../mn-custom-body-host/mn-custom-body-host.component';
import {MnLanguageService} from '../../../../language';
import {LucideDynamicIcon, LucideIconData} from '@lucide/angular';
import {MN_MODAL_ACTION_ICONS, MODAL_ACTION_ICON_SIZE} from '../../mn-modal-action-icons';

@Component({
  selector: 'mn-confirmation-body',
  standalone: true,
  imports: [CommonModule, MnButton, MnFormBodyComponent, MnCustomBodyHostComponent, ReactiveFormsModule, LucideDynamicIcon],
  templateUrl: './mn-confirmation-body.component.html',
  styleUrls: ['./mn-confirmation-body.component.css'],
})
export class MnConfirmationBodyComponent<TResult = boolean> implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  @Input() config!: ConfirmationModalConfig<TResult>;
  @Input() modalRef!: MnModalRef<TResult>;

  @ViewChild(MnFormBodyComponent) formBody?: MnFormBodyComponent;

  confirmButtonStatus = 'VALID';
  hasFormFields = false;

  private languageService = inject(MnLanguageService);

  ngOnInit(): void {
    this.hasFormFields = !!(
      (this.config.fields && this.config.fields.length > 0) ||
      (this.config.fieldGroups && this.config.fieldGroups.length > 0) ||
      (this.config.rows && this.config.rows.length > 0)
    );
  }

  onFormStatusChange(status: string): void {
    this.confirmButtonStatus = status;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  async confirm(): Promise<void> {
    if (this.hasFormFields && this.formBody?.form.invalid) {
      this.formBody.form.markAllAsTouched();
      return;
    }

    const result = (this.hasFormFields ? this.formBody?.form.value : true) as TResult;

    if (this.config.confirm?.handler) {
      await this.config.confirm.handler.handle(result);
    }

    this.modalRef.close(result);
  }

  cancel(): void {
    const reason = this.config.cancel?.reason || ModalCloseReason.CANCELLED;
    this.modalRef.dismiss(reason);
  }

  private resolveLabel(value: string | undefined, key: string, fallback: string): string {
    if (value) return value;
    const translated = this.languageService.translate(`common.${key}`);
    return translated === `common.${key}` ? fallback : translated;
  }

  get confirmLabel(): string {
    return this.resolveLabel(this.config.confirm?.label, 'confirm', 'Confirm');
  }

  get cancelLabel(): string {
    return this.resolveLabel(this.config.cancel?.label, 'cancel', 'Cancel');
  }

  get confirmStyle(): ActionStyle {
    return this.config.confirm?.style || ActionStyle.PRIMARY;
  }

  get cancelStyle(): ActionStyle {
    return this.config.cancel?.style || ActionStyle.SECONDARY;
  }

  get toneClass(): string {
    switch (this.config.tone) {
      case ConfirmationTone.WARNING:
        return 'tone-warning';
      case ConfirmationTone.DANGER:
        return 'tone-danger';
      default:
        return 'tone-default';
    }
  }

  getButtonColor(style: ActionStyle): 'primary' | 'secondary' | 'danger' | 'warning' | 'success' {
    switch (style) {
      case ActionStyle.PRIMARY:
        return 'primary';
      case ActionStyle.DANGER:
        return 'danger';
      case ActionStyle.GHOST:
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  getButtonVariant(style: ActionStyle): 'fill' | 'outline' | 'text' {
    switch (style) {
      case ActionStyle.PRIMARY:
      case ActionStyle.DANGER:
        return 'fill';
      case ActionStyle.GHOST:
        return 'text';
      default:
        return 'outline';
    }
  }
  get isConfirmDisabled(): boolean {
    if (this.hasFormFields) {
      return this.confirmButtonStatus !== 'VALID';
    }
    return false;
  }

  /** Icon size (px) for the action buttons. */
  readonly actionIconSize = MODAL_ACTION_ICON_SIZE;

  /** Whether action-button icons should render on this modal (defaults to true). */
  get showActionIcons(): boolean {
    return this.config.showActionIcons !== false;
  }

  /**
   * The leading icon for the confirm button, or null when icons are disabled.
   * Uses the per-action override, else defaults by style (DANGER → trash, else check).
   */
  get confirmIcon(): LucideIconData | null {
    if (!this.showActionIcons) return null;
    if (this.config.confirm?.icon) return this.config.confirm.icon;
    return this.confirmStyle === ActionStyle.DANGER
      ? MN_MODAL_ACTION_ICONS.danger
      : MN_MODAL_ACTION_ICONS.confirm;
  }

  /** The leading icon for the cancel button, or null when icons are disabled. */
  get cancelIcon(): LucideIconData | null {
    if (!this.showActionIcons) return null;
    return this.config.cancel?.icon ?? MN_MODAL_ACTION_ICONS.cancel;
  }
}
