import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MnModalRef} from '../../mn-modal-ref';
import {
  ActionStyle,
  BackdropMode,
  CloseMode,
  ConfirmationModalConfig,
  CustomModalConfig,
  FormModalConfig,
  KeyboardMode,
  ModalCloseReason,
  ModalConfig,
  ModalFooterAction,
  ModalKind,
  ModalSize,
  WizardModalConfig,
} from '../../mn-modal.types';
import {MnWizardBodyComponent} from '../mn-wizard-body/mn-wizard-body.component';
import {MnFormBodyComponent} from '../mn-form-body/mn-form-body.component';
import {MnConfirmationBodyComponent} from '../mn-confirmation-body/mn-confirmation-body.component';
import {MnCustomBodyHostComponent} from '../mn-custom-body-host/mn-custom-body-host.component';
import {MnFooterActionsComponent} from '../mn-footer-actions/mn-footer-actions.component';

@Component({
  selector: 'mn-modal-shell',
  standalone: true,
  imports: [
    CommonModule,
    MnWizardBodyComponent,
    MnFormBodyComponent,
    MnConfirmationBodyComponent,
    MnCustomBodyHostComponent,
    MnFooterActionsComponent,
  ],
  templateUrl: './mn-modal-shell.component.html',
  styleUrls: ['./mn-modal-shell.component.css'],
})
export class MnModalShellComponent<TResult = unknown> implements OnInit, AfterViewInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  @Input() config!: ModalConfig<TResult>;
  @Input() modalRef!: MnModalRef<TResult>;

  isClosing = false;
  isStacked = false;
  readonly ModalKind = ModalKind;
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusTrapListener: ((e: KeyboardEvent) => void) | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private pollAttempts = 0;

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

  asWizard(config: ModalConfig<TResult>): WizardModalConfig {
    return config as unknown as WizardModalConfig;
  }

  asForm(config: ModalConfig<TResult>): FormModalConfig {
    return config as unknown as FormModalConfig;
  }

  asConfirmation(config: ModalConfig<TResult>): ConfirmationModalConfig {
    return config as unknown as ConfirmationModalConfig;
  }

  asCustom(config: ModalConfig<TResult>): CustomModalConfig {
    return config as unknown as CustomModalConfig;
  }

  @HostBinding('class') get hostClasses(): string {
    const size = this.config.sizeWidth || ModalSize.MD;
    const closing = this.isClosing ? ' closing' : '';
    const animType = typeof this.config.animation === 'string'
      ? this.config.animation
      : this.config.animation?.type || 'slide';
    const animation = ` anim-${animType}`;
    const stacked = this.isStacked ? ' is-stacked' : '';
    const mobileSheet = this.isMobileSheet ? ' mobile-sheet' : '';
    return `modal-shell modal-${size}${closing}${animation}${stacked}${mobileSheet}`;
  }

  /** Whether this modal renders as a bottom sheet on small screens (default: true). */
  get isMobileSheet(): boolean {
    return this.config.mobileBottomSheet !== false;
  }

  /** Triggers the closing animation. Deferred to avoid NG0100 when called during a CD cycle. */
  startClosing(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.isClosing = true;
        this.cdr.detectChanges();
        setTimeout(resolve, 150);
      });
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
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

  private static readonly SWIPE_DISMISS_THRESHOLD = 100;

  // =========================
  // Mobile bottom-sheet swipe-to-dismiss (via the grabber handle)
  // =========================
  /** Current downward drag offset (px) applied to the sheet while swiping. */
  sheetDragY = 0;
  /** True while the user is actively dragging the grabber (disables snap transition). */
  isDraggingSheet = false;
  private dragStartY = 0;

  /** Whether the sheet can be dismissed at all (drives whether the swipe is armed). */
  private get canClose(): boolean {
    return this.config.closeMode !== CloseMode.DISABLED;
  }

  onGrabberPointerDown(event: PointerEvent): void {
    if (!this.isMobileSheet || !this.canClose) return;
    this.isDraggingSheet = true;
    this.dragStartY = event.clientY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onGrabberPointerMove(event: PointerEvent): void {
    if (!this.isDraggingSheet) return;
    // Only track downward movement.
    this.sheetDragY = Math.max(0, event.clientY - this.dragStartY);
  }

  async onGrabberPointerUp(): Promise<void> {
    if (!this.isDraggingSheet) return;
    this.isDraggingSheet = false;

    if (this.sheetDragY > MnModalShellComponent.SWIPE_DISMISS_THRESHOLD) {
      const closed = await this.handleClose(ModalCloseReason.DISMISSED);
      if (!closed) {
        this.sheetDragY = 0; // guard rejected — spring back
      }
      // closed === true: leave it; the closing animation takes over.
    } else {
      this.sheetDragY = 0; // not far enough — spring back
    }
  }

  /** Attempts to dismiss the modal. Resolves true if it was actually dismissed,
   *  false if blocked by a DISABLED close mode or a rejected close guard. */
  private async handleClose(reason: ModalCloseReason): Promise<boolean> {
    if (this.config.closeMode === CloseMode.DISABLED) {
      return false;
    }

    if (this.config.closeMode === CloseMode.GUARDED) {
      if (this.config.closeGuard) {
        const allowed = await this.config.closeGuard();
        if (!allowed) return false;
      }
    }

    this.modalRef.dismiss(reason);
    return true;
  }

  get showBackdrop(): boolean {
    return this.config.backdrop !== BackdropMode.HIDE;
  }

  get containerSizeClass(): string {
    switch (this.config.sizeWidth || ModalSize.MD) {
      case ModalSize.SM: return 'w-96';
      case ModalSize.MD: return 'w-[32rem]';
      case ModalSize.LG: return 'w-[48rem]';
      case ModalSize.XL: return 'w-[64rem]';
      case ModalSize.FULL: return 'w-[95vw]';
      default: return 'w-[32rem]';
    }
  }

  get containerHeightStyle(): string | null {
    if (this.config.sizeWidth === ModalSize.FULL && !this.config.sizeHeight) {
      return '95vh';
    }
    if (!this.config.sizeHeight) return null;
    switch (this.config.sizeHeight) {
      case ModalSize.SM: return '30vh';
      case ModalSize.MD: return '50vh';
      case ModalSize.LG: return '70vh';
      case ModalSize.XL: return '85vh';
      case ModalSize.FULL: return '95vh';
      default: return null;
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
