import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  signal,
  viewChild
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
import {MnButton} from '../../../mn-button';
import {LucideX} from '@lucide/angular';
import {MN_HAPTICS} from '../../mn-modal-haptics';

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
    MnButton,
    LucideX,
  ],
  templateUrl: './mn-modal-shell.component.html',
  styleUrls: ['./mn-modal-shell.component.css'],
})
export class MnModalShellComponent<TResult = unknown> implements OnInit, AfterViewInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  /** Downward release speed (px/ms) above which a short drag still dismisses — a "flick".
   *  Native sheets dismiss on a quick flick regardless of distance, not just a long drag. */
  private static readonly FLICK_VELOCITY = 0.5;

  @Input() config!: ModalConfig<TResult>;
  @Input() modalRef!: MnModalRef<TResult>;

  isClosing = false;
  /**
   * Whether another modal is stacked on top of this one. Set imperatively by
   * `MnModalService` on the already-rendered shell below the newly opened one, so it must
   * be a signal: mutating a plain field there changes the host `[class]` after the view was
   * checked (NG0100 ExpressionChangedAfterItHasBeenChecked) and does not schedule change
   * detection in a zoneless app. A signal write both notifies the host binding and schedules CD.
   */
  readonly isStacked = signal(false);
  readonly ModalKind = ModalKind;
  /** The rendered wizard body, when this modal is a wizard — used to read the active step title. */
  private readonly wizardBody = viewChild(MnWizardBodyComponent);
  /**
   * Title of the wizard's current step, or undefined for non-wizard modals.
   * The template appends it to the modal title on small screens, where the
   * step labels under the progress circles are hidden.
   */
  readonly wizardStepTitle = computed(() => this.wizardBody()?.currentStepTitle());
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusTrapListener: ((e: KeyboardEvent) => void) | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private pollAttempts = 0;

  ngOnInit(): void {
    this.startPollingIfConfigured();
  }
  /** Minimum drag distance (px) that must accompany a flick, so an incidental fast tap
   *  on the grabber never dismisses. Below the distance threshold, only a flick dismisses. */
  private static readonly FLICK_MIN_DISTANCE = 32;

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

  private static readonly SWIPE_DISMISS_THRESHOLD = 150;
  /** Optional native haptic engine. Absent on the web — every call is null-guarded. */
  private haptics = inject(MN_HAPTICS, {optional: true});
  /** The two most recent (y, timestamp) pointer samples, used to estimate the release
   *  velocity for flick-to-dismiss. `t` uses the event timestamp (monotonic, no Date). */
  private lastSample: { y: number; t: number } | null = null;

  /** Upper bound for the close wait if no animation/transition end event fires
   *  (e.g. an animation was suppressed). Must stay longer than the slowest close
   *  path (mobile sheet slide-down 0.45s, swipe glide 0.3s) so it never preempts. */
  private static readonly CLOSE_FALLBACK_MS = 700;

  /** Whether this modal renders as a bottom sheet on small screens (default: true). */
  get isMobileSheet(): boolean {
    return this.config.mobileBottomSheet !== false;
  }

  /**
   * Triggers the closing animation and resolves once it has actually finished.
   *
   * Deferred via setTimeout to avoid NG0100 when called during a CD cycle.
   * Rather than guess a fixed duration (the old hardcoded 150ms truncated the
   * mobile slide-down, which runs 250ms — and the swipe glide, 300ms), we wait
   * for the container's `animationend`/`transitionend` and tear down then. A
   * fallback timeout guarantees resolution if no such event fires, and we
   * short-circuit entirely under reduced motion (the CSS collapses to instant).
   */
  startClosing(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.isClosing = true;
        // @HostBinding('class') updates are flushed when the host view is checked
        // (appRef.tick), not by a bare detectChanges() on this dynamically-created
        // root component. Relying on CD alone means the `.closing` class — and thus
        // the slide-down animation — never lands in a zoneless app and is timing-
        // fragile elsewhere. Apply it directly so the close animation is reliable.
        this.el.nativeElement.classList.add('closing');
        this.cdr.detectChanges();

        if (this.prefersReducedMotion()) {
          resolve();
          return;
        }

        const container = this.el.nativeElement.querySelector('.modal-container') as HTMLElement | null;
        if (!container) {
          resolve();
          return;
        }

        let settled = false;
        const done = (event?: Event): void => {
          // Ignore end events bubbling up from descendant animations/transitions.
          if (event && event.target !== container) return;
          if (settled) return;
          settled = true;
          container.removeEventListener('animationend', done);
          container.removeEventListener('transitionend', done);
          clearTimeout(fallback);
          resolve();
        };

        // Normal close ends via a keyframe (animationend); the swipe-dismiss
        // glide ends via the transform transition (transitionend).
        container.addEventListener('animationend', done);
        container.addEventListener('transitionend', done);
        // `done` only runs asynchronously, after this assignment completes.
        const fallback = setTimeout(done, MnModalShellComponent.CLOSE_FALLBACK_MS);
      });
    });
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    const shouldClose = this.config.backdrop === BackdropMode.CLOSABLE
      || (this.isMobileSheet && this.config.backdrop !== BackdropMode.STATIC);
    if (shouldClose) {
      this.handleClose(ModalCloseReason.BACKDROP);
    }
  }

  onCloseButtonClick(): void {
    this.handleClose(ModalCloseReason.DISMISSED);
  }
  /** True once a swipe has crossed the dismiss threshold — slides the sheet off-screen
   *  via the transform transition instead of replaying the slide-up keyframe. */
  swipeDismissing = false;

  // =========================
  // Mobile bottom-sheet swipe-to-dismiss (via the grabber handle)
  // =========================
  /** Current downward drag offset (px) applied to the sheet while swiping. */
  sheetDragY = 0;
  /** True while the user is actively dragging the grabber (disables snap transition). */
  isDraggingSheet = false;
  private prevSample: { y: number; t: number } | null = null;

  @HostBinding('class') get hostClasses(): string {
    const size = this.config.sizeWidth || ModalSize.MD;
    // `closing` is intentionally NOT derived here. startClosing() adds the
    // `.closing` class imperatively (classList.add) for reliable, zoneless-safe
    // application. Deriving it from `isClosing` in this getter as well makes the
    // host class string flip value after the view has been checked, which throws
    // NG0100 (ExpressionChangedAfterItHasBeenCheckedError) in dev. Angular's class
    // binding only manages the tokens it emits, so it leaves the imperatively
    // added `.closing` untouched.
    const animType = typeof this.config.animation === 'string'
      ? this.config.animation
      : this.config.animation?.type || 'slide';
    const animation = ` anim-${animType}`;
    const stacked = this.isStacked() ? ' is-stacked' : '';
    const mobileSheet = this.isMobileSheet ? ' mobile-sheet' : '';
    const swiping = this.swipeDismissing ? ' swipe-dismissing' : '';
    return `modal-shell modal-${size}${animation}${stacked}${mobileSheet}${swiping}`;
  }
  private dragStartY = 0;

  /** Whether the sheet can be dismissed at all (drives whether the swipe is armed). */
  private get canClose(): boolean {
    return this.config.closeMode !== CloseMode.DISABLED;
  }

  /** Tailwind's `sm` breakpoint — below this the modal renders as a bottom sheet. */
  private static readonly SHEET_MAX_WIDTH = 639.98;

  ngAfterViewInit(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this.setupFocusTrap();
    // Focus the modal container
    const container = this.el.nativeElement.querySelector('.modal-container') as HTMLElement;
    if (container) {
      container.focus();
    }
  }

  onSheetPointerDown(event: PointerEvent): void {
    if (!this.isMobileSheet || !this.canClose) return;
    // Only a bottom sheet (mobile-width viewport) can be swiped away.
    if (window.innerWidth > MnModalShellComponent.SHEET_MAX_WIDTH) return;
    // Don't hijack drags that begin on an interactive control (e.g. the close button).
    if ((event.target as HTMLElement).closest('button')) return;
    this.isDraggingSheet = true;
    this.dragStartY = event.clientY;
    // Seed the velocity samples so a fast flick that releases on the first move still
    // has a baseline to measure against.
    this.lastSample = {y: event.clientY, t: event.timeStamp};
    this.prevSample = this.lastSample;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onSheetPointerMove(event: PointerEvent): void {
    if (!this.isDraggingSheet) return;
    // Only track downward movement.
    this.sheetDragY = Math.max(0, event.clientY - this.dragStartY);
    // Roll the sample window forward so pointer-up can read the latest instantaneous speed.
    this.prevSample = this.lastSample;
    this.lastSample = {y: event.clientY, t: event.timeStamp};
  }

  async onSheetPointerUp(): Promise<void> {
    if (!this.isDraggingSheet) return;
    this.isDraggingSheet = false;

    if (this.shouldDismissSheet()) {
      const closed = await this.handleClose(ModalCloseReason.DISMISSED);
      if (closed) {
        // A confirmed dismissal gets a slightly firmer tick than the open tap.
        this.haptics?.impact('medium');
        // Continue the gesture: glide the sheet the rest of the way down rather than
        // snapping back to 0 and replaying the slide-up keyframe (which looked un-animated).
        this.swipeDismissing = true;
        this.sheetDragY = window.innerHeight;
        this.cdr.detectChanges();
      } else {
        this.snapBack(); // guard rejected — spring back
      }
    } else {
      this.snapBack(); // not far enough / not a flick — spring back
    }

    this.lastSample = null;
    this.prevSample = null;
  }

  /** Whether the release should dismiss: a long-enough drag OR a fast downward flick. */
  private shouldDismissSheet(): boolean {
    if (this.sheetDragY > MnModalShellComponent.SWIPE_DISMISS_THRESHOLD) {
      return true;
    }
    return this.releaseVelocity() > MnModalShellComponent.FLICK_VELOCITY
      && this.sheetDragY > MnModalShellComponent.FLICK_MIN_DISTANCE;
  }

  /** Downward release speed (px/ms) from the last two pointer samples. Positive means
   *  moving down. Returns 0 when there is no usable sample window. */
  private releaseVelocity(): number {
    if (!this.lastSample || !this.prevSample) return 0;
    const dt = this.lastSample.t - this.prevSample.t;
    if (dt <= 0) return 0;
    return (this.lastSample.y - this.prevSample.y) / dt;
  }

  /** Springs the sheet back to its resting position after a drag that didn't dismiss. */
  private snapBack(): void {
    this.sheetDragY = 0;
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
