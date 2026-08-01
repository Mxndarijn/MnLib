import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  inject,
  Input,
  Output,
  viewChild,
} from '@angular/core';
import {NgClass} from '@angular/common';

/**
 * A viewport-anchored bottom sheet — the mobile presentation shared by the modal
 * shell and the multi-select dropdown.
 *
 * It owns only the sheet *chrome and gestures*: a bottom-anchored, full-width,
 * rounded-top surface with an optional dimming backdrop and drag grabber, a
 * slide-up entrance, swipe/flick-to-dismiss, and a promise-based slide-down exit.
 * It is deliberately presentational: the body is projected via `<ng-content>`, and
 * dismissal is reported through {@link dismiss} for the host to act on (run a close
 * guard, tear down its overlay, …) rather than being handled here.
 *
 * Positioning is `position: fixed` against the viewport, so a consumer whose sheet
 * lives inside a `transform`/`filter` ancestor (which would otherwise become the
 * containing block) must relocate this host to `document.body` — as the
 * multi-select does with its portal helper.
 */
@Component({
  selector: 'mn-bottom-sheet',
  standalone: true,
  imports: [NgClass],
  templateUrl: './mn-bottom-sheet.component.html',
  styleUrl: './mn-bottom-sheet.component.css',
})
export class MnBottomSheet {
  /** Tailwind's `sm` breakpoint — at or below this the swipe gesture is armed.
   *  Kept in step with the same constant in the modal shell and multi-select. */
  private static readonly SHEET_MAX_WIDTH = 639.98;
  /** Drag distance (px) past which a release dismisses regardless of speed. */
  private static readonly SWIPE_DISMISS_THRESHOLD = 150;
  /** Downward release speed (px/ms) above which a short drag still dismisses — a "flick". */
  private static readonly FLICK_VELOCITY = 0.5;
  /** Minimum drag distance (px) a flick must cover, so an incidental fast tap never dismisses. */
  private static readonly FLICK_MIN_DISTANCE = 32;
  /** Upper bound for the exit wait if no `transitionend` fires (e.g. animation suppressed). */
  private static readonly CLOSE_FALLBACK_MS = 700;
  /** Whether to render the dimming backdrop behind the sheet (default: true).
   *  A host that already paints its own backdrop (the modal shell) sets this false. */
  @Input() showBackdrop = true;
  /** Whether to render the drag grabber handle that arms swipe-to-dismiss (default: true). */
  @Input() showGrabber = true;
  /** Whether the sheet can be dismissed by the user via swipe/flick or backdrop tap
   *  (default: true). When false the gestures are inert and the backdrop is non-closing. */
  @Input() dismissible = true;
  /** Optional `min-height` floor (px) for the container, so filtering its content
   *  shorter cannot shrink the sheet mid-interaction. Null leaves it content-sized. */
  @Input() minHeightPx: number | null = null;
  /** Cap on the sheet height as a fraction of the viewport, in vh (default: 80). */
  @Input() maxHeightVh = 80;
  /** Extra class(es) applied to the sheet container, so a host can attach the hooks
   *  its own CSS depends on (e.g. the modal shell's `modal-container`). */
  @Input() containerClass = '';
  /** Accessible name for the sheet dialog. */
  @Input() ariaLabel?: string;
  /** Id of the element that labels this dialog (takes precedence over `ariaLabel`). */
  @Input() ariaLabelledby?: string;
  /**
   * When true, the sheet grows to its `maxHeightVh` while the host app marks the soft
   * keyboard open (a `.mn-keyboard-open` class on a document ancestor), guaranteeing
   * scroll room to lift a focused field above an overlaying keyboard. Off by default so
   * a keyboard opened over an unrelated sheet (a multi-select search) does not resize it.
   */
  @Input() growWithKeyboard = false;
  /**
   * Optional async gate consulted before a user-initiated dismissal (swipe/flick/backdrop
   * tap) is committed. Resolving false aborts the dismissal and springs the sheet back —
   * used by the modal to run its close guard (e.g. an unsaved-changes prompt). A
   * programmatic {@link startClosing} bypasses it.
   */
  @Input() dismissGuard?: () => boolean | Promise<boolean>;
  /**
   * Emitted once the user has dismissed the sheet — after the slide-down exit has
   * finished, so the host can remove the sheet from the DOM without cutting the
   * animation short. The host decides what dismissal means (close, run a guard, …).
   */
  @Output() dismiss = new EventEmitter<void>();
  /** Current downward drag offset (px) applied to the sheet while swiping. */
  sheetDragY = 0;
  /** True while the user is actively dragging the grabber (disables the snap transition). */
  isDraggingSheet = false;
  /** True once a dismissal has committed — the sheet glides off-screen via its transition. */
  isDismissing = false;
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** The sheet container element, used to measure its height and drive the exit. */
  private readonly containerRef = viewChild<ElementRef<HTMLElement>>('container');
  private dragStartY = 0;

  /** The two most recent (y, timestamp) pointer samples, for estimating flick velocity.
   *  `t` uses the event timestamp (monotonic), so no wall-clock is read. */
  private lastSample: { y: number; t: number } | null = null;
  private prevSample: { y: number; t: number } | null = null;

  /** In-flight exit animation, so a swipe-dismiss and a follow-up programmatic
   *  {@link startClosing} share one glide instead of re-triggering it. */
  private exitPromise: Promise<void> | null = null;

  @HostBinding('class') get hostClasses(): string {
    return `mn-bottom-sheet${this.isDismissing ? ' is-dismissing' : ''}`
      + `${this.growWithKeyboard ? ' grow-with-keyboard' : ''}`;
  }

  /** Whether the viewport is currently narrow enough for the sheet to accept a swipe. */
  private get isNarrow(): boolean {
    return typeof window === 'undefined' || window.innerWidth <= MnBottomSheet.SHEET_MAX_WIDTH;
  }

  onSheetPointerDown(event: PointerEvent): void {
    if (!this.dismissible || !this.isNarrow) return;
    // Don't hijack drags that begin on an interactive control inside the sheet.
    if ((event.target as HTMLElement).closest('button, input, textarea, select, a')) return;
    this.isDraggingSheet = true;
    this.dragStartY = event.clientY;
    // Seed the velocity window so a fast flick that releases on the first move still measures.
    this.lastSample = {y: event.clientY, t: event.timeStamp};
    this.prevSample = this.lastSample;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onSheetPointerMove(event: PointerEvent): void {
    if (!this.isDraggingSheet) return;
    // Only track downward movement.
    this.sheetDragY = Math.max(0, event.clientY - this.dragStartY);
    this.prevSample = this.lastSample;
    this.lastSample = {y: event.clientY, t: event.timeStamp};
  }

  onSheetPointerUp(): void {
    if (!this.isDraggingSheet) return;
    this.isDraggingSheet = false;

    if (this.shouldDismiss()) {
      void this.attemptDismiss();
    } else {
      this.snapBack();
    }

    this.lastSample = null;
    this.prevSample = null;
  }

  onBackdropClick(): void {
    void this.attemptDismiss();
  }

  /**
   * Plays the slide-down exit and resolves once it has finished. Exposed so a host that
   * dismisses the sheet programmatically (not via a gesture) can await the same exit
   * before tearing the sheet down. Idempotent: a swipe-dismiss already in flight and a
   * subsequent programmatic close share the one glide rather than restarting it.
   */
  startClosing(): Promise<void> {
    return this.playExit();
  }

  /**
   * Runs the optional {@link dismissGuard}, then either commits the dismissal (glide out
   * + emit) or springs the sheet back if the guard rejects. A non-dismissible sheet never
   * gets here from a gesture, but the guard is still short-circuited defensively.
   */
  private async attemptDismiss(): Promise<void> {
    if (!this.dismissible) return;
    if (this.dismissGuard) {
      const allowed = await this.dismissGuard();
      if (!allowed) {
        this.snapBack();
        this.cdr.detectChanges();
        return;
      }
    }
    this.commitDismiss();
  }

  /** Whether the release should dismiss: a long-enough drag OR a fast downward flick. */
  private shouldDismiss(): boolean {
    if (this.sheetDragY > MnBottomSheet.SWIPE_DISMISS_THRESHOLD) {
      return true;
    }
    return this.releaseVelocity() > MnBottomSheet.FLICK_VELOCITY
      && this.sheetDragY > MnBottomSheet.FLICK_MIN_DISTANCE;
  }

  /** Downward release speed (px/ms) from the last two pointer samples; 0 when unusable. */
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

  /**
   * Commits a dismissal: glides the sheet the rest of the way off-screen, then emits
   * {@link dismiss} once the exit animation settles. Continuing the gesture (rather than
   * snapping back to 0 first) keeps a swipe feeling like one unbroken motion.
   */
  private commitDismiss(): void {
    void this.playExit().then(() => this.dismiss.emit());
  }

  /** Commits the exit animation exactly once and returns the shared in-flight promise.
   *  Short-circuits under reduced motion and falls back to a timeout if no event fires. */
  private playExit(): Promise<void> {
    if (this.exitPromise) return this.exitPromise;
    this.isDismissing = true;
    this.sheetDragY = window.innerHeight;
    this.cdr.detectChanges();
    this.exitPromise = this.awaitExit();
    return this.exitPromise;
  }

  /** Waits for the container's exit transition to end, with a reduced-motion short-circuit
   *  and a fallback timeout so it always resolves. */
  private awaitExit(): Promise<void> {
    return new Promise(resolve => {
      if (this.prefersReducedMotion()) {
        resolve();
        return;
      }
      const container = this.containerRef()?.nativeElement
        ?? this.el.nativeElement.querySelector<HTMLElement>('.mn-sheet-container');
      if (!container) {
        resolve();
        return;
      }
      let settled = false;
      const done = (event?: Event): void => {
        // Ignore end events bubbling up from descendant transitions.
        if (event && event.target !== container) return;
        if (settled) return;
        settled = true;
        container.removeEventListener('transitionend', done);
        clearTimeout(fallback);
        resolve();
      };
      container.addEventListener('transitionend', done);
      const fallback = setTimeout(done, MnBottomSheet.CLOSE_FALLBACK_MS);
    });
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
