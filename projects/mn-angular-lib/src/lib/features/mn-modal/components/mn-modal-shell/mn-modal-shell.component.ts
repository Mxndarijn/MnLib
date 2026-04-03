import { Component, HostBinding, HostListener, Input, ElementRef, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MnModalRef } from '../../mn-modal-ref';
import {
  ModalConfig,
  ModalKind,
  ModalSize,
  BackdropMode,
  KeyboardMode,
  CloseMode,
  ModalCloseReason,
  ModalFooterAction,
  ActionStyle,
} from '../../mn-modal.types';
import { MnWizardBodyComponent } from '../mn-wizard-body/mn-wizard-body.component';
import { MnFormBodyComponent } from '../mn-form-body/mn-form-body.component';
import { MnConfirmationBodyComponent } from '../mn-confirmation-body/mn-confirmation-body.component';
import { MnCustomBodyHostComponent } from '../mn-custom-body-host/mn-custom-body-host.component';
import { MnButton } from '../../../mn-button/mn-button';

@Component({
  selector: 'mn-modal-shell',
  standalone: true,
  imports: [
    CommonModule,
    MnWizardBodyComponent,
    MnFormBodyComponent,
    MnConfirmationBodyComponent,
    MnCustomBodyHostComponent,
    MnButton,
  ],
  templateUrl: './mn-modal-shell.component.html',
  styleUrls: ['./mn-modal-shell.component.css'],
})
export class MnModalShellComponent<TResult = any> implements OnInit, AfterViewInit, OnDestroy {
  @Input() config!: ModalConfig<TResult>;
  @Input() modalRef!: MnModalRef<TResult>;

  isClosing = false;
  readonly ModalKind = ModalKind;
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusTrapListener: ((e: KeyboardEvent) => void) | null = null;
  private pollingTimer: any = null;
  private pollAttempts = 0;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.startPollingIfConfigured();
  }

  ngAfterViewInit(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this.setupFocusTrap();
    // Focus the modal container
    const container = this.el.nativeElement.querySelector('.modal-container') as HTMLElement;
    if (container) {
      container.focus();
    }
  }

  ngOnDestroy(): void {
    this.removeFocusTrap();
    this.stopPolling();
    // Restore focus to previously focused element
    if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
      this.previouslyFocusedElement.focus();
    }
  }

  private setupFocusTrap(): void {
    this.focusTrapListener = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = this.el.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    this.el.nativeElement.addEventListener('keydown', this.focusTrapListener);
  }

  private removeFocusTrap(): void {
    if (this.focusTrapListener) {
      this.el.nativeElement.removeEventListener('keydown', this.focusTrapListener);
      this.focusTrapListener = null;
    }
  }

  asWizard(config: any): any {
    return config;
  }

  asForm(config: any): any {
    return config;
  }

  asConfirmation(config: any): any {
    return config;
  }

  asCustom(config: any): any {
    return config;
  }

  asAny(val: any): any {
    return val;
  }

  @HostBinding('class') get hostClasses(): string {
    const size = this.config.size || ModalSize.MD;
    const closing = this.isClosing ? ' closing' : '';
    return `modal-shell modal-${size}${closing}`;
  }

  startClosing(): Promise<void> {
    this.isClosing = true;
    return new Promise(resolve => setTimeout(resolve, 150));
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: any): void {
    if (this.config.keyboard === KeyboardMode.ENABLED) {
      this.handleClose(ModalCloseReason.ESCAPE);
      if (event && event.preventDefault) {
        event.preventDefault();
      }
    }
  }

  onBackdropClick(): void {
    if (this.config.backdrop === BackdropMode.CLOSABLE) {
      this.handleClose(ModalCloseReason.BACKDROP);
    }
  }

  onCloseButtonClick(): void {
    this.handleClose(ModalCloseReason.DISMISSED);
  }

  private async handleClose(reason: ModalCloseReason): Promise<void> {
    if (this.config.closeMode === CloseMode.DISABLED) {
      return;
    }

    if (this.config.closeMode === CloseMode.GUARDED) {
      if (this.config.closeGuard) {
        const allowed = await this.config.closeGuard();
        if (!allowed) return;
      }
    }

    this.modalRef.dismiss(reason);
  }

  get showBackdrop(): boolean {
    return this.config.backdrop !== BackdropMode.HIDE;
  }

  get containerSizeClass(): string {
    switch (this.config.size || ModalSize.MD) {
      case ModalSize.SM: return 'w-96';
      case ModalSize.MD: return 'w-[32rem]';
      case ModalSize.LG: return 'w-[48rem]';
      case ModalSize.XL: return 'w-[64rem]';
      case ModalSize.FULL: return 'w-[95vw] h-[95vh] max-h-[95vh]';
      default: return 'w-[32rem]';
    }
  }

  get showCloseButton(): boolean {
    return this.config.closeMode !== CloseMode.DISABLED;
  }

  // =========================
  // Footer Actions
  // =========================

  get hasCustomFooterActions(): boolean {
    return !!this.config.footerActions && this.config.footerActions.length > 0;
  }

  get leftFooterActions(): ModalFooterAction<TResult>[] {
    return (this.config.footerActions || []).filter(a => a.position === 'left');
  }

  get rightFooterActions(): ModalFooterAction<TResult>[] {
    return (this.config.footerActions || []).filter(a => a.position !== 'left');
  }

  async onFooterAction(action: ModalFooterAction<TResult>): Promise<void> {
    if (action.disabled) return;
    if (action.handler) {
      await action.handler(this.modalRef);
    }
    if (action.closesModal) {
      if (action.closeReason === ModalCloseReason.COMPLETED) {
        this.modalRef.close();
      } else {
        this.modalRef.dismiss(action.closeReason || ModalCloseReason.DISMISSED);
      }
    }
  }

  getActionButtonColor(style?: ActionStyle): 'primary' | 'secondary' | 'danger' | 'warning' | 'success' {
    switch (style) {
      case ActionStyle.PRIMARY: return 'primary';
      case ActionStyle.DANGER: return 'danger';
      case ActionStyle.GHOST: return 'secondary';
      default: return 'secondary';
    }
  }

  getActionButtonVariant(style?: ActionStyle): 'fill' | 'outline' | 'text' {
    switch (style) {
      case ActionStyle.PRIMARY:
      case ActionStyle.DANGER: return 'fill';
      case ActionStyle.GHOST: return 'text';
      default: return 'outline';
    }
  }

  // =========================
  // Polling
  // =========================

  private startPollingIfConfigured(): void {
    const polling = this.config.polling;
    if (!polling) return;
    if (polling.autoStart === false) return;
    this.startPolling();
  }

  private startPolling(): void {
    const polling = this.config.polling;
    if (!polling) return;

    this.pollingTimer = setInterval(async () => {
      this.pollAttempts++;
      try {
        const shouldStop = await polling.onPoll(this.modalRef);
        if (shouldStop === true) {
          this.stopPolling();
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
      if (polling.maxAttempts && this.pollAttempts >= polling.maxAttempts) {
        this.stopPolling();
      }
    }, polling.interval);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
}
