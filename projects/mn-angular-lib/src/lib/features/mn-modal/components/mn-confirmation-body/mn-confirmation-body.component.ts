import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MnModalRef } from '../../mn-modal-ref';
import {
  ConfirmationModalConfig,
  ConfirmationTone,
  ActionStyle,
  ModalCloseReason,
} from '../../mn-modal.types';
import { MnButton } from '../../../mn-button/mn-button';

@Component({
  selector: 'mn-confirmation-body',
  standalone: true,
  imports: [CommonModule, MnButton],
  templateUrl: './mn-confirmation-body.component.html',
  styleUrls: ['./mn-confirmation-body.component.css'],
})
export class MnConfirmationBodyComponent<TResult = boolean> {
  @Input() config!: ConfirmationModalConfig<TResult>;
  @Input() modalRef!: MnModalRef<TResult>;

  async confirm(): Promise<void> {
    const result = true as TResult;

    if (this.config.confirm?.handler) {
      await this.config.confirm.handler.handle(result);
    }

    this.modalRef.close(result);
  }

  cancel(): void {
    const reason = this.config.cancel?.reason || ModalCloseReason.CANCELLED;
    this.modalRef.dismiss(reason);
  }

  get confirmLabel(): string {
    return this.config.confirm?.label || 'Confirm';
  }

  get cancelLabel(): string {
    return this.config.cancel?.label || 'Cancel';
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
}
