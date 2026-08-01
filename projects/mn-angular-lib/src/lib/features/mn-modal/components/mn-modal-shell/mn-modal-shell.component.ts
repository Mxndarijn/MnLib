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
import {MnBottomSheet} from '../../../mn-bottom-sheet';
import {LucideX} from '@lucide/angular';
import {MN_HAPTICS} from '../../mn-modal-haptics';
import {MnLanguageService} from '../../../../language';

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
    MnBottomSheet,
    LucideX,
  ],
  templateUrl: './mn-modal-shell.component.html',
  styleUrls: ['./mn-modal-shell.component.css'],
})
export class MnModalShellComponent<TResult = unknown> implements OnInit, AfterViewInit, OnDestroy {
  private readonly lang = inject(MnLanguageService);

  /**
   * Accessible name for this control. Resolved through the conventional
   * `mnModal.close` key so an app can translate it, falling back to English when the
   * key is not defined rather than leaking the raw key into the UI.
   */
  get closeModalLabel(): string {
    return this.lang.translateIfPresent('mnModal.close') ?? 'Close modal';
  }

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private cdr = inject(ChangeDetectorRef);

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
  /** Tailwind's `sm` breakpoint — below this the modal presents as a bottom sheet. */
  private static readonly SHEET_MAX_WIDTH = 639.98;
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
  /** Upper bound for the close wait if no animation/transition end event fires
   *  (e.g. an animation was suppressed). Must stay longer than the slowest close
   *  path so it never preempts. */
  private static readonly CLOSE_FALLBACK_MS = 700;
  /** Live match of the sheet breakpoint, so the modal switches between the centered dialog
   *  and the bottom sheet when the viewport crosses it (e.g. an orientation change). */
  readonly isNarrow = signal(false);
  /** The bottom sheet presenting this modal on mobile, absent on the desktop dialog path. */
  private readonly bottomSheet = viewChild(MnBottomSheet);
  /** Optional native haptic engine. Absent on the web — every call is null-guarded. */
  private haptics = inject(MN_HAPTICS, {optional: true});
  private sheetMedia: MediaQueryList | null = null;
  private sheetMediaListener: ((event: MediaQueryListEvent) => void) | null = null;

  /** Whether this modal is allowed to present as a bottom sheet on small screens (default: true). */
  get isMobileSheet(): boolean {
    return this.config.mobileBottomSheet !== false;
  }

  /** Whether the modal should currently render as a bottom sheet (mobile) rather than the
   *  centered dialog (desktop). */
  get showMobileSheet(): boolean {
    return this.isMobileSheet && this.isNarrow();
  }

  @HostBinding('class') get hostClasses(): string {
    const size = this.config.sizeWidth || ModalSize.MD;
    // `closing` is intentionally NOT derived here. startClosing() adds the
    // `.closing` class imperatively (classList.add) for reliable, zoneless-safe
    // application. Deriving it here as well flips the host class string after the
    // view has been checked (NG0100). Angular's class binding only manages the tokens
    // it emits, so it leaves the imperatively added `.closing` untouched.
    const animType = typeof this.config.animation === 'string'
      ? this.config.animation
      : this.config.animation?.type || 'slide';
    const animation = ` anim-${animType}`;
    const stacked = this.isStacked() ? ' is-stacked' : '';
    const mobileSheet = this.showMobileSheet ? ' mobile-sheet' : '';
    return `modal-shell modal-${size}${animation}${stacked}${mobileSheet}`;
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

  /** Whether the modal can be dismissed at all (drives the sheet's swipe/backdrop arming). */
  get canClose(): boolean {
    return this.config.closeMode !== CloseMode.DISABLED;
  }

  ngOnInit(): void {
    this.startWatchingViewport();
    this.startPollingIfConfigured();
  }

  ngOnDestroy(): void {
    this.removeFocusTrap();
    this.stopPolling();
    this.stopWatchingViewport();
    // Restore focus to previously focused element
    if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
      this.previouslyFocusedElement.focus();
    }
  }

  /**
   * Triggers the closing animation and resolves once it has actually finished.
   *
   * Deferred via setTimeout to avoid NG0100 when called during a CD cycle. On mobile the
   * exit is owned by the bottom sheet, so we delegate to its `startClosing()` (idempotent
   * with a swipe-dismiss already in flight); on desktop we wait for the dialog container's
   * `animationend`/`transitionend`. A fallback timeout guarantees resolution if no event
   * fires, and we short-circuit under reduced motion (the CSS collapses to instant).
   */
  startClosing(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(async () => {
        this.isClosing = true;
        // @HostBinding('class') updates are flushed when the host view is checked
        // (appRef.tick), not by a bare detectChanges() on this dynamically-created
        // root component. Apply the `.closing` class directly so the backdrop fade is
        // reliable in a zoneless app.
        this.el.nativeElement.classList.add('closing');
        this.cdr.detectChanges();

        if (this.prefersReducedMotion()) {
          resolve();
          return;
        }

        // Mobile: the bottom sheet drives the slide-down exit.
        const sheet = this.bottomSheet();
        if (sheet) {
          await sheet.startClosing();
          resolve();
          return;
        }

        // Desktop: wait for the centered dialog container's own close animation.
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

        container.addEventListener('animationend', done);
        container.addEventListener('transitionend', done);
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

  /**
   * Guard consulted by the bottom sheet before it commits a swipe/flick/backdrop dismissal.
   * Mirrors the DISABLED/GUARDED rules of {@link handleClose} so a swipe cannot escape a
   * modal that a button close could not. Bound as a field so the template passes it directly.
   */
  readonly sheetDismissGuard = async (): Promise<boolean> => {
    if (this.config.closeMode === CloseMode.DISABLED) {
      return false;
    }
    if (this.config.closeMode === CloseMode.GUARDED && this.config.closeGuard) {
      return await this.config.closeGuard();
    }
    return true;
  };

  /**
   * Handles the sheet's `(dismiss)` — emitted only after its guard passed and its exit
   * animation finished. Dismisses the modal (no re-guard) with a confirming haptic.
   */
  onSheetDismiss(): void {
    this.haptics?.impact('medium');
    this.modalRef.dismiss(ModalCloseReason.DISMISSED);
  }

  ngAfterViewInit(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this.setupFocusTrap();
    // Focus the modal container (the centered dialog, or the sheet's container on mobile).
    const container = this.el.nativeElement.querySelector('.modal-container') as HTMLElement;
    if (container) {
      container.focus();
    }
  }

  /** Tracks the sheet breakpoint through `matchMedia` so the dialog/sheet fork re-renders
   *  when the viewport crosses it. */
  private startWatchingViewport(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    this.sheetMedia = window.matchMedia(`(max-width: ${MnModalShellComponent.SHEET_MAX_WIDTH}px)`);
    this.isNarrow.set(this.sheetMedia.matches);
    this.sheetMediaListener = (event: MediaQueryListEvent) => this.isNarrow.set(event.matches);
    this.sheetMedia.addEventListener('change', this.sheetMediaListener);
  }

  /** Tears down the breakpoint listener. Idempotent. */
  private stopWatchingViewport(): void {
    if (this.sheetMedia && this.sheetMediaListener) {
      this.sheetMedia.removeEventListener('change', this.sheetMediaListener);
    }
    this.sheetMedia = null;
    this.sheetMediaListener = null;
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
