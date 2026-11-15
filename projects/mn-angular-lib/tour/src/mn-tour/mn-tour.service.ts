import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable,
  OnDestroy,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { boxChanged, padBox, placeBeside, waitForTourTarget } from './mn-tour-geometry';
import { MnTourCardAction, MnTourCardVariant, MnTourCardView, MnTourOverlay } from './mn-tour-overlay';
import {
  MN_TOUR_MOTION,
  MnTourOfferOptions,
  MnTourOfferOutcome,
  MnTourOptions,
  MnTourOutcome,
} from './mn-tour.types';

/** Below this width (px) the card is a bottom sheet: Tailwind's `lg` breakpoint, exclusive. */
const COMPACT_MAX_WIDTH = 1023.98;
/** How long a step waits for its target by default (ms). */
const DEFAULT_TARGET_TIMEOUT_MS = 4000;
/** Space (px) a scrolled-to target keeps from the viewport's edges (and from the sheet). */
const SCROLL_MARGIN = 16;

/** A running tour, as returned by {@link MnTourService.start}. */
export class MnTourRef {
  /**
   * @param result Settles once, with how the tour ended.
   * @param step The 0-based index of the step on screen (-1 before the first one shows). Read it
   *   synchronously to persist "the last step reached" when the page unloads mid-tour.
   * @param closeFn Ends the tour from outside.
   */
  constructor(
    readonly result: Promise<MnTourOutcome>,
    readonly step: Signal<number>,
    private readonly closeFn: () => void,
  ) {}

  /** Ends the tour without an answer from the user (outcome `closed`). Idempotent. */
  close(): void {
    this.closeFn();
  }
}

/** An open offer card, as returned by {@link MnTourService.offer}. */
export class MnTourOfferRef {
  /**
   * @param result Settles once, with the user's answer.
   * @param closeFn Removes the card without an answer.
   */
  constructor(
    readonly result: Promise<MnTourOfferOutcome>,
    private readonly closeFn: () => void,
  ) {}

  /** Removes the card without an answer (outcome `closed`). Idempotent. */
  close(): void {
    this.closeFn();
  }
}

/** State of a tour while it runs. */
type TourSession = {
  /** Discriminates the session union. */
  kind: 'tour';
  /** What the tour was started with. */
  options: MnTourOptions;
  /** Index of the step on screen, -1 before the first. */
  index: WritableSignal<number>;
  /** Step whose `after` still has to run, or -1. */
  pendingAfter: number;
  /** Steps found missing, left out of the dots and skipped by Vorige. */
  missing: Set<number>;
  /** The highlighted element, null on a centred step. */
  target: HTMLElement | null;
  /** True while a step change is in flight; input is ignored meanwhile. */
  busy: boolean;
  /** True once the outcome is decided. */
  ended: boolean;
  /** Settles the ref's `result`. */
  resolve: (outcome: MnTourOutcome) => void;
};

/** State of an offer while it is open. */
type OfferSession = {
  /** Discriminates the session union. */
  kind: 'offer';
  /** What the offer was opened with. */
  options: MnTourOfferOptions;
  /** True once answered or closed. */
  ended: boolean;
  /** Settles the ref's `result`. */
  resolve: (outcome: MnTourOfferOutcome) => void;
};

/**
 * Runs guided tours: a highlight around `[data-tour="…"]` elements and a card that walks the user
 * through them, plus the offer card that proposes a tour.
 *
 * The service knows nothing about routing, modules or storage. The caller passes translated
 * texts, moves the app between steps with each step's `before()`, and persists what the returned
 * outcome reports. One tour or offer is on screen at a time; starting another closes the current
 * one. Starting a tour straight from an accepted offer (or from a final card's "Start volgende")
 * reuses the card already on screen instead of removing and re-adding it.
 *
 * Motion (D10): between two targets on the same page the highlight and the card glide (450 ms).
 * A step with `before()`, a step after a centred card and a step after a missing one fade the
 * highlight out (200 ms), jump, and fade in (450 ms, ease-out). The card's content crossfades
 * (120 ms out, 120 ms in). Under `prefers-reduced-motion` there is no glide and no fade.
 *
 * Keyboard: Escape skips (on an offer: declines), ArrowRight and Enter go forward, ArrowLeft goes
 * back. Focus moves into the card and returns where it was when the tour ends. The corner offer
 * is the exception: it does not take focus, because it appears unasked on a page the user is
 * working on; it is still reachable with Tab, and Escape works once focus is inside it.
 */
@Injectable({ providedIn: 'root' })
export class MnTourService implements OnDestroy {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  /** The mounted overlay, or null. */
  private overlayRef: ComponentRef<MnTourOverlay> | null = null;
  /** The tour or offer on screen, or null. */
  private session: TourSession | OfferSession | null = null;
  /** Pending fade-out or removal of the overlay. */
  private teardownTimer: ReturnType<typeof setTimeout> | null = null;
  /** Where focus was before the overlay appeared, restored when it goes. */
  private returnFocus: HTMLElement | null = null;
  /** Undoes the listeners that keep the highlight on its target. */
  private stopTrackingFn: (() => void) | null = null;
  /** Document keydown listener, registered only while the overlay exists. */
  private readonly onKeyDown = (event: KeyboardEvent): void => this.handleKey(event);
  /** Window resize listener, registered only while the overlay exists. */
  private readonly onResize = (): void => this.reposition();

  /**
   * Starts a tour. A tour or offer already on screen is closed first (its outcome `closed`).
   * @param options The steps, labels and optional next-tour block.
   * @returns A ref whose `result` settles with how the tour ended.
   */
  start(options: MnTourOptions): MnTourRef {
    this.closeCurrent();
    let resolve!: (outcome: MnTourOutcome) => void;
    const result = new Promise<MnTourOutcome>((r) => (resolve = r));
    const index = signal(-1);
    const session: TourSession = {
      kind: 'tour',
      options,
      index,
      pendingAfter: -1,
      missing: new Set(),
      target: null,
      busy: false,
      ended: false,
      resolve,
    };
    const ref = new MnTourRef(result, index.asReadonly(), () => {
      void this.endTour(session, { status: 'closed', step: session.index() });
    });

    if (options.steps.length === 0) {
      session.ended = true;
      resolve({ status: 'completed', step: -1, startNext: false });
      return ref;
    }

    this.session = session;
    this.ensureOverlay();
    const first = Math.min(Math.max(options.startAt ?? 0, 0), options.steps.length - 1);
    void this.go(session, first, 1);
    return ref;
  }

  /**
   * Shows an offer card. A tour or offer already on screen is closed first.
   * @param options Placement, texts and button labels.
   * @returns A ref whose `result` settles with the user's answer.
   */
  offer(options: MnTourOfferOptions): MnTourOfferRef {
    this.closeCurrent();
    let resolve!: (outcome: MnTourOfferOutcome) => void;
    const result = new Promise<MnTourOfferOutcome>((r) => (resolve = r));
    const session: OfferSession = { kind: 'offer', options, ended: false, resolve };
    this.session = session;

    const ov = this.ensureOverlay();
    const corner = options.placement === 'corner';
    ov.variant.set(this.offerVariant(options));
    ov.view.set({
      kicker: options.kicker,
      title: options.title,
      body: options.body,
      secondary: options.labels.dismiss,
      primary: options.labels.accept,
    });
    ov.dim.set(corner ? 'none' : 'full');
    ov.holeVisible.set(false);
    ov.gliding.set(false);
    ov.cardPos.set(null);
    ov.cardVisible.set(true);
    ov.contentVisible.set(true);
    this.render();
    if (!corner) ov.focusCard();

    return new MnTourOfferRef(result, () => this.answerOffer(session, { status: 'closed' }));
  }

  /** Whether a tour or an offer is on screen. */
  isActive(): boolean {
    return this.session !== null;
  }

  /**
   * Whether the viewport is below `lg`, where the card is a bottom sheet. Public so a test (or
   * an app with its own breakpoint logic) can override it.
   */
  isCompactViewport(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width: ${COMPACT_MAX_WIDTH}px)`).matches
      : false;
  }

  /** Whether the user asked for reduced motion. Public so a test can override it. */
  prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /** Removes the overlay if the service itself is destroyed (an app or test teardown). */
  ngOnDestroy(): void {
    this.closeCurrent();
    this.destroyOverlay();
  }

  /** Steps through the tour: from the current step to `to`, skipping missing steps in `dir`. */
  private async go(s: TourSession, to: number, dir: 1 | -1): Promise<void> {
    if (s.busy || s.ended) return;
    s.busy = true;
    try {
      await this.advance(s, to, dir, true);
    } finally {
      s.busy = false;
    }
  }

  /**
   * {@link go} without the re-entrance guard.
   * @param allowFallback When going back finds nothing, re-show the current step once.
   */
  private async advance(s: TourSession, to: number, dir: 1 | -1, allowFallback: boolean): Promise<void> {
    const steps = s.options.steps;
    const ov = this.overlay();
    const from = s.index();
    const holeWasVisible = ov.dim() === 'hole' && ov.holeVisible();
    let left = false;
    let i = to;

    while (i >= 0 && i < steps.length) {
      const step = steps[i];
      const glide = holeWasVisible && !left && !!step.target && !step.before;

      if (!left) {
        left = true;
        this.stopTracking();
        ov.contentVisible.set(false);
        if (glide) await this.wait(MN_TOUR_MOTION.contentFadeMs);
        else await this.fadeOut();
        await this.runAfter(s);
      } else {
        await this.fadeOut();
      }
      if (s.ended) return;

      // From here on this step owns the page state its `before` sets up, so its `after` runs
      // even if the step turns out missing or the tour ends while it is still being prepared.
      s.pendingAfter = i;
      if (step.before) {
        try {
          await step.before();
        } catch {
          this.markMissing(s, i, 'before-failed');
          await this.runAfter(s);
          i += dir;
          continue;
        }
        if (s.ended) return;
      }

      let target: HTMLElement | null = null;
      if (step.target) {
        target = await waitForTourTarget(
          step.target,
          s.options.targetTimeoutMs ?? DEFAULT_TARGET_TIMEOUT_MS,
          () => s.ended,
        );
        if (s.ended) return;
        if (!target) {
          this.markMissing(s, i, 'target-not-found');
          await this.runAfter(s);
          i += dir;
          continue;
        }
      }

      await this.present(s, i, target, glide && i === to);
      return;
    }

    // Ran off an end. Back means nothing earlier exists: show the step we came from (or the
    // next one that does) again. Forward means nothing is left to show: the tour is over.
    if (dir === -1 && from >= 0 && allowFallback) {
      return this.advance(s, from, 1, false);
    }
    await this.endTour(
      s,
      s.index() >= 0 ? { status: 'completed', step: s.index(), startNext: false } : { status: 'closed', step: -1 },
    );
  }

  /** Puts step `i` on screen: content, highlight, card position, focus and tracking. */
  private async present(s: TourSession, i: number, target: HTMLElement | null, glide: boolean): Promise<void> {
    const ov = this.overlay();
    const reduced = this.prefersReducedMotion();
    s.index.set(i);
    s.pendingAfter = i;
    s.target = target;

    const variant = this.stepVariant(target);
    ov.reducedMotion.set(reduced);
    ov.variant.set(variant);
    ov.view.set(this.stepView(s, i));
    ov.dim.set(target ? 'hole' : 'full');
    this.render();

    if (target) this.scrollIntoView(target, variant === 'sheet');
    ov.gliding.set(glide && !reduced);
    this.place(target);
    ov.holeVisible.set(!!target);
    ov.cardVisible.set(true);
    ov.contentVisible.set(true);
    this.render();

    if (!ov.hasFocus()) ov.focusCard();
    this.startTracking(target);

    if (glide && !reduced) {
      await this.wait(MN_TOUR_MOTION.glideMs);
      if (this.session === s) ov.gliding.set(false);
    }
  }

  /** Sets the highlight's box and, beside a target, the card's position. */
  private place(target: HTMLElement | null): void {
    const ov = this.overlay();
    if (target) ov.hole.set(padBox(target.getBoundingClientRect()));
    const hole = ov.hole();
    const size = ov.cardSize();
    if (ov.variant() === 'beside' && hole && size) {
      ov.cardPos.set(placeBeside(hole, size, { width: window.innerWidth, height: window.innerHeight }));
    } else {
      ov.cardPos.set(null);
    }
  }

  /**
   * Fades the highlight and the dim out (200 ms), and the card too unless it is a bottom sheet,
   * which stays put. Returns at once when nothing was visible.
   */
  private async fadeOut(): Promise<void> {
    const ov = this.overlay();
    const holeVisible = ov.dim() === 'hole' && ov.holeVisible();
    const dimVisible = ov.dim() === 'full';
    const fadeCard = ov.cardVisible() && ov.variant() !== 'sheet';
    if (!holeVisible && !dimVisible && !fadeCard) return;
    ov.gliding.set(false);
    ov.holeVisible.set(false);
    if (dimVisible) ov.dim.set('hole');
    if (fadeCard) ov.cardVisible.set(false);
    await this.wait(MN_TOUR_MOTION.fadeOutMs);
  }

  /** Ends a tour once: runs the current step's `after`, settles the result, removes the overlay. */
  private async endTour(s: TourSession, outcome: MnTourOutcome): Promise<void> {
    if (s.ended) return;
    s.ended = true;
    if (this.session === s) {
      this.session = null;
      this.stopTracking();
    }
    await this.runAfter(s);
    s.resolve(outcome);
    this.scheduleTeardown();
  }

  /** Settles an offer once and removes the overlay unless a tour takes it over. */
  private answerOffer(s: OfferSession, outcome: MnTourOfferOutcome): void {
    if (s.ended) return;
    s.ended = true;
    if (this.session === s) this.session = null;
    s.resolve(outcome);
    this.scheduleTeardown();
  }

  /** Closes whatever is on screen, without an answer. */
  private closeCurrent(): void {
    const s = this.session;
    if (!s) return;
    if (s.kind === 'tour') void this.endTour(s, { status: 'closed', step: s.index() });
    else this.answerOffer(s, { status: 'closed' });
  }

  /** Runs the `after` of the step that was last shown, once. A throw is ignored. */
  private async runAfter(s: TourSession): Promise<void> {
    const i = s.pendingAfter;
    s.pendingAfter = -1;
    const after = i >= 0 ? s.options.steps[i].after : undefined;
    if (!after) return;
    try {
      await after();
    } catch {
      // A failing clean-up must not strand the user inside the tour.
    }
  }

  /** Records a step as missing and tells the caller. */
  private markMissing(s: TourSession, i: number, reason: 'target-not-found' | 'before-failed'): void {
    s.missing.add(i);
    s.options.onStepMissing?.(i, s.options.steps[i], reason);
  }

  /** Reacts to the card's controls. */
  private onAction(action: MnTourCardAction): void {
    const s = this.session;
    if (!s) return;
    if (s.kind === 'offer') {
      if (action === 'primary') this.answerOffer(s, { status: 'accepted' });
      else if (action === 'secondary') this.answerOffer(s, { status: 'dismissed' });
      return;
    }
    const i = s.index();
    if (i < 0) return;
    if (action === 'skip') {
      void this.endTour(s, { status: 'skipped', step: i });
      return;
    }
    if (s.busy) return;
    const last = this.isLastStep(s, i);
    if (action === 'link') {
      // End first (the outcome settles, the overlay starts to go), then hand over to the app.
      const link = s.options.finalLink;
      if (last && link) {
        void this.endTour(s, { status: 'completed', step: i, startNext: false }).then(() => link.run());
      }
      return;
    }
    if (action === 'primary') {
      if (last) void this.endTour(s, { status: 'completed', step: i, startNext: !!s.options.nextTour });
      else void this.go(s, i + 1, 1);
    } else if (last && s.options.nextTour) {
      void this.endTour(s, { status: 'completed', step: i, startNext: false });
    } else if (this.hasPrevious(s, i)) {
      void this.go(s, i - 1, -1);
    }
  }

  /** Keyboard: Escape skips/declines, ArrowRight/Enter forward, ArrowLeft back. */
  private handleKey(event: KeyboardEvent): void {
    const s = this.session;
    const ov = this.overlayRef?.instance;
    if (!s || !ov || event.defaultPrevented || event.isComposing) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    // A dimmed card is modal: Tab cycles inside it instead of reaching the page behind the
    // blocker, where a focused link would navigate away mid-tour. The corner offer is not modal.
    if (event.key === 'Tab') {
      if (ov.dim() !== 'none') ov.trapTab(event);
      return;
    }

    if (s.kind === 'offer') {
      const inScope = s.options.placement === 'centred' || ov.hasFocus();
      if (event.key === 'Escape' && inScope) {
        event.preventDefault();
        this.answerOffer(s, { status: 'dismissed' });
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.onAction('skip');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.onAction('primary');
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      // On a final card with a next tour the secondary button is Sluiten, not Vorige.
      if (!(this.isLastStep(s, s.index()) && s.options.nextTour)) this.onAction('secondary');
    } else if (event.key === 'Enter') {
      // A focused button already turns Enter into its own click; handling it here too would
      // advance twice.
      const el = event.target as HTMLElement | null;
      if (el?.closest?.('button, a, input, textarea, select')) return;
      event.preventDefault();
      this.onAction('primary');
    }
  }

  /** Whether step `i` is the last one. */
  private isLastStep(s: TourSession, i: number): boolean {
    return i === s.options.steps.length - 1;
  }

  /** Whether there is an earlier step not known to be missing. */
  private hasPrevious(s: TourSession, i: number): boolean {
    for (let j = i - 1; j >= 0; j--) if (!s.missing.has(j)) return true;
    return false;
  }

  /** The card's content for step `i`. */
  private stepView(s: TourSession, i: number): MnTourCardView {
    const { steps, labels, nextTour } = s.options;
    const step = steps[i];
    const last = this.isLastStep(s, i);
    const total = steps.length - s.missing.size;
    let active = i;
    for (const m of s.missing) if (m < i) active--;
    const withNext = last && !!nextTour;
    return {
      kicker: step.kicker,
      title: step.title,
      body: step.body,
      nextTour: withNext ? nextTour : undefined,
      link: last ? s.options.finalLink?.label : undefined,
      skip: last ? undefined : labels.skip,
      secondary: withNext ? labels.close : this.hasPrevious(s, i) ? labels.previous : undefined,
      primary: withNext ? labels.startNext : last ? labels.done : labels.next,
      progress: total > 1 ? { total, active, label: labels.stepLabel(active + 1, total) } : undefined,
    };
  }

  /** Where a step's card goes at the current viewport width. */
  private stepVariant(target: HTMLElement | null): MnTourCardVariant {
    if (this.isCompactViewport()) return 'sheet';
    return target ? 'beside' : 'centred';
  }

  /** Where an offer's card goes at the current viewport width. */
  private offerVariant(options: MnTourOfferOptions): MnTourCardVariant {
    if (options.placement === 'corner') return 'corner';
    return this.isCompactViewport() ? 'sheet' : 'centred';
  }

  /**
   * Scrolls the target into view if it is not fully visible: centred on desktop, and clear of
   * the sheet on a phone (a temporary `scroll-margin` makes the browser leave room for it).
   */
  private scrollIntoView(target: HTMLElement, sheet: boolean): void {
    const bottomReserve = SCROLL_MARGIN + (sheet ? (this.overlay().cardSize()?.height ?? 0) : 0);
    const rect = target.getBoundingClientRect();
    if (rect.top >= SCROLL_MARGIN && rect.bottom <= window.innerHeight - bottomReserve) return;
    const { scrollMarginTop, scrollMarginBottom } = target.style;
    target.style.scrollMarginTop = `${SCROLL_MARGIN}px`;
    target.style.scrollMarginBottom = `${bottomReserve}px`;
    // 'instant', not 'auto': 'auto' follows a page's `scroll-behavior: smooth`, and the highlight
    // would then be measured mid-scroll and chase its target while fading in.
    target.scrollIntoView({ block: sheet ? 'nearest' : 'center', inline: 'nearest', behavior: 'instant' });
    target.style.scrollMarginTop = scrollMarginTop;
    target.style.scrollMarginBottom = scrollMarginBottom;
  }

  /**
   * Keeps the highlight on its target while the page scrolls or the target reflows. Scroll is
   * listened for on the document in the capture phase: the app's scroll container is usually a
   * layout element, whose scroll events never reach `window`.
   */
  private startTracking(target: HTMLElement | null): void {
    this.stopTracking();
    if (!target) return;
    let frame = 0;
    const update = (): void => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        this.reposition();
      });
    };
    document.addEventListener('scroll', update, { capture: true, passive: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(target);
    this.stopTrackingFn = () => {
      document.removeEventListener('scroll', update, { capture: true });
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }

  /** Undoes {@link startTracking}. */
  private stopTracking(): void {
    this.stopTrackingFn?.();
    this.stopTrackingFn = null;
  }

  /**
   * Re-measures after a scroll, a resize or a reflow: the card's variant (the viewport may have
   * crossed `lg`), the highlight and the card's position. A change during a glide retargets it;
   * otherwise it is instant, so the ring never lags behind the page.
   */
  private reposition(): void {
    const s = this.session;
    const ov = this.overlayRef?.instance;
    if (!s || !ov) return;
    if (s.kind === 'offer') {
      ov.variant.set(this.offerVariant(s.options));
      return;
    }
    if (s.busy && !ov.gliding()) return;
    const target = s.target;
    if (target && !target.isConnected) {
      // The page changed under the tour (e.g. browser back): hide the ring rather than point
      // at nothing. Whether to close the tour is the app's call.
      ov.holeVisible.set(false);
      return;
    }
    const variant = this.stepVariant(target);
    const moved = !target || boxChanged(ov.hole(), padBox(target.getBoundingClientRect()));
    if (variant === ov.variant() && !moved && variant !== 'beside') return;
    ov.variant.set(variant);
    this.render();
    this.place(target);
  }

  /** The overlay, created and attached on first use; a pending teardown is cancelled. */
  private ensureOverlay(): MnTourOverlay {
    if (this.teardownTimer) {
      clearTimeout(this.teardownTimer);
      this.teardownTimer = null;
    }
    if (this.overlayRef) return this.overlayRef.instance;

    const active = document.activeElement;
    this.returnFocus = active instanceof HTMLElement && active !== document.body ? active : null;

    const ref = createComponent(MnTourOverlay, { environmentInjector: this.injector });
    ref.instance.reducedMotion.set(this.prefersReducedMotion());
    ref.instance.action.subscribe((action) => this.onAction(action));
    this.appRef.attachView(ref.hostView);
    document.body.appendChild(ref.location.nativeElement);
    document.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('resize', this.onResize);
    this.overlayRef = ref;
    return ref.instance;
  }

  /** The overlay, recreated if a teardown raced ahead of a late step. */
  private overlay(): MnTourOverlay {
    return this.overlayRef?.instance ?? this.ensureOverlay();
  }

  /**
   * Removes the overlay after a session ends, unless another one starts first: after a macrotask
   * (so a tour started from an accepted offer's `then` keeps the card), fade out, then destroy.
   */
  private scheduleTeardown(): void {
    if (this.teardownTimer) clearTimeout(this.teardownTimer);
    this.teardownTimer = setTimeout(() => {
      this.teardownTimer = null;
      const ov = this.overlayRef?.instance;
      if (this.session || !ov) return;
      ov.gliding.set(false);
      ov.contentVisible.set(false);
      ov.holeVisible.set(false);
      ov.cardVisible.set(false);
      if (ov.dim() === 'full') ov.dim.set('hole');
      const delay = this.prefersReducedMotion() ? 0 : MN_TOUR_MOTION.fadeOutMs;
      this.teardownTimer = setTimeout(() => {
        this.teardownTimer = null;
        if (!this.session) this.destroyOverlay();
      }, delay);
    });
  }

  /** Detaches and destroys the overlay, drops the listeners and gives focus back. */
  private destroyOverlay(): void {
    if (this.teardownTimer) {
      clearTimeout(this.teardownTimer);
      this.teardownTimer = null;
    }
    this.stopTracking();
    const ref = this.overlayRef;
    if (!ref) return;
    const hadFocus = ref.instance.hasFocus();
    this.overlayRef = null;
    document.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('resize', this.onResize);
    this.appRef.detachView(ref.hostView);
    ref.destroy();
    ref.location.nativeElement.remove();
    const back = this.returnFocus;
    this.returnFocus = null;
    if (back?.isConnected && (hadFocus || document.activeElement === document.body)) {
      back.focus({ preventScroll: true });
    }
  }

  /** Synchronously renders the overlay, so it can be measured right after a state change. */
  private render(): void {
    this.overlayRef?.changeDetectorRef.detectChanges();
  }

  /** Waits `ms`, or not at all under reduced motion. */
  private wait(ms: number): Promise<void> {
    if (ms <= 0 || this.prefersReducedMotion()) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
