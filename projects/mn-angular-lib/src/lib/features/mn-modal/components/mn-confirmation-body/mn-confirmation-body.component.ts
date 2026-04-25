import { ChangeDetectorRef, Component, Input, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MnModalRef } from '../../mn-modal-ref';
import {
  ConfirmationModalConfig,
  ConfirmationTone,
  ActionStyle,
  ModalCloseReason,
} from '../../mn-modal.types';
import { MnButton } from '../../../mn-button/mn-button';
import { MnFormBodyComponent } from '../mn-form-body/mn-form-body.component';
import { MnCustomBodyHostComponent } from '../mn-custom-body-host/mn-custom-body-host.component';

@Component({
  selector: 'mn-confirmation-body',
  standalone: true,
  imports: [CommonModule, MnButton, MnFormBodyComponent, MnCustomBodyHostComponent, ReactiveFormsModule],
  templateUrl: './mn-confirmation-body.component.html',
  styleUrls: ['./mn-confirmation-body.component.css'],
})
export class MnConfirmationBodyComponent<TResult = boolean> implements OnInit {
  @Input() config!: ConfirmationModalConfig<TResult>;
  @Input() modalRef!: MnModalRef<TResult>;

  @ViewChild(MnFormBodyComponent) formBody?: MnFormBodyComponent;

  confirmButtonStatus = 'VALID';
  hasFormFields = false;

  constructor(private cdr: ChangeDetectorRef) {}

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
  asAny(val: any): any {
    return val;
  }

  get isConfirmDisabled(): boolean {
    if (this.hasFormFields) {
      if (this.formBody?.form) {
        return this.formBody.form.invalid;
      }
      // If we have form fields but formBody is not yet ready,
      // use the last known status if available
      return this.confirmButtonStatus !== 'VALID';
    }
    return false;
  }

  asField(field: any): any {
    return field;
  }
}
