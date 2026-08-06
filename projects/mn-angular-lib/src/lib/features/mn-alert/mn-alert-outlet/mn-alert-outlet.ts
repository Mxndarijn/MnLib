import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  signal,
  TemplateRef,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {MnAlertStore} from '../mn-alert.store';
import {MnAlert, MnAlertId} from '../mn-alert.types';
import {mnAlertVariants} from '../mn-alertVariants';
import {MnButton} from '../../mn-button/mn-button';
import {MnLanguageService} from '../../../language';

export type MnAlertTemplateContext = {
  $implicit: MnAlert;
  alert: MnAlert;
  dismiss: () => void;
}

/**
 * A view-owned wrapper around a single {@link MnAlert}. The store's list is the source
 * of truth for which alerts *exist*; this outlet mirrors it into `views` so a removed
 * alert can play a leave animation (swipe-fling or fade + height-collapse) before its
 * node is actually dropped, rather than vanishing instantly.
 */
type MnAlertView = {
  alert: MnAlert;
  /** True once the alert has left the store — the node is animating out and will be removed. */
  leaving: boolean;
  /** True while the user is actively dragging this card (disables the snap transition). */
  dragging: boolean;
  /** Live drag offset (px) along the active swipe axis while swiping. */
  drag: number;
  /** Final offset (px) along the swipe axis the card flings to when a swipe dismisses it. */
  fling: number;
};

@Component({
  selector: 'mn-alert-outlet',
  standalone: true,
  imports: [CommonModule, MnButton],
  templateUrl: './mn-alert-outlet.html',
  styleUrl: './mn-alert-outlet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnAlertOutletComponent {
  private readonly lang = inject(MnLanguageService);
  private readonly store = inject(MnAlertStore);
  private readonly destroyRef = inject(DestroyRef);

  /** Drag distance (px) past which a release dismisses regardless of speed. */
  private static readonly SWIPE_DISMISS_THRESHOLD = 96;
  /** Release speed (px/ms) above which a short drag still dismisses — a "flick". */
  private static readonly FLICK_VELOCITY = 0.4;
  /** Minimum drag distance (px) a flick must cover, so an incidental fast tap never dismisses. */
  private static readonly FLICK_MIN_DISTANCE = 24;
  /** Upper bound for the leave wait; kept a touch longer than the CSS exit so removal never
   *  preempts the animation. Mirrored by the `--mn-alert-exit` duration in the stylesheet. */
  private static readonly EXIT_MS = 320;
  /** Opacity floor a card fades to at the dismiss threshold, for drag feedback. */
  private static readonly DRAG_OPACITY_FLOOR = 0.35;

  /**
   * How the dismiss swipe is oriented:
   * - `'auto'` (default) matches the host platform's convention — Apple platforms
   *   (iOS/iPadOS/macOS) flick a top banner *upward*, so we swipe vertically; Android (and
   *   every other platform) dismisses toasts *to the right*, so we swipe horizontally.
   *
   * Either axis is one-directional: only an upward (vertical) or rightward (horizontal)
   * drag dismisses; dragging the opposite way springs the card back.
   * - `'vertical'` / `'horizontal'` force the axis regardless of platform. Useful when the
   *   host can't be sniffed reliably (e.g. Chrome DevTools *Responsive* mode does not spoof
   *   the user agent, so `'auto'` there resolves to the desktop/Android horizontal axis).
   */
  @Input() swipeAxis: 'auto' | 'vertical' | 'horizontal' = 'auto';

  /** Whether the running device is an Apple platform. Sniffed once from `navigator` at
   *  construction (the UA is read at page load and does not change mid-session). */
  private readonly isApple = this.detectApple();

  /** The resolved swipe axis: the explicit {@link swipeAxis} override, or the platform
   *  default when left on `'auto'`. */
  private get vertical(): boolean {
    if (this.swipeAxis === 'vertical') return true;
    if (this.swipeAxis === 'horizontal') return false;
    return this.isApple;
  }

  /**
   * Accessible name for this control. Resolved through the conventional
   * `mnAlert.close` key so an app can translate it, falling back to English when the
   * key is not defined rather than leaking the raw key into the UI.
   */
  get closeLabel(): string {
    return this.lang.translateIfPresent('mnAlert.close') ?? 'Close';
  }

  @Input() template?: TemplateRef<MnAlertTemplateContext>;

  /** The view-layer mirror of the store's alerts, retaining alerts mid-leave. A signal so
   *  writes from the (external) store subscription and leave timers schedule change
   *  detection in a zoneless app. */
  readonly views = signal<MnAlertView[]>([]);

  /**
   * `touch-action` for the swipe wrapper: reserve the swipe axis for our gesture while
   * leaving the cross-axis to the browser. Vertical swipe (Apple) claims the Y axis
   * (`pan-x`); horizontal swipe (Android/other) claims the X axis (`pan-y`).
   */
  get touchAction(): string {
    return this.vertical ? 'pan-x' : 'pan-y';
  }

  /** In-flight leave-removal timers, keyed by alert id, cleared on destroy so a fired
   *  timer never touches a torn-down view. */
  private readonly exitTimers = new Map<MnAlertId, ReturnType<typeof setTimeout>>();

  /** The single active swipe, or null. Only one card is dragged at a time. `startCoord`
   *  and the samples are taken along the active axis (Y when vertical, else X). */
  private activeDrag: {
    view: MnAlertView;
    startCoord: number;
    lastSample: { c: number; t: number };
    prevSample: { c: number; t: number };
  } | null = null;

  constructor() {
    this.store.alerts$
      .pipe(takeUntilDestroyed())
      .subscribe(alerts => this.sync(alerts));

    this.destroyRef.onDestroy(() => {
      this.exitTimers.forEach(t => clearTimeout(t));
      this.exitTimers.clear();
    });
  }

  trackById = (_: number, v: MnAlertView) => v.alert.id;

  getAlertClasses(a: MnAlert) {
    return mnAlertVariants({kind: a.kind, variant: a.variant});
  }

  contextFor(a: MnAlert) {
    return {
      $implicit: a,
      alert: a,
      dismiss: () => this.dismissAlert(a.id)
    } as const;
  }

  /** Dismisses via the store; the store's removal is turned into a leave animation by
   *  {@link sync}. Used by the close button and the custom-template `dismiss` context. */
  dismissAlert(id: MnAlertId) {
    this.store.dismiss(id);
  }

  // =========================
  // Store → view reconciliation
  // =========================

  /** Reconciles the view list against the store: appends new alerts, updates the alert
   *  reference for still-present ones, and marks vanished ones as leaving (they stay in the
   *  list, animating out, until their removal timer fires). */
  private sync(alerts: MnAlert[]): void {
    const current = this.views();
    const existing = new Set(current.map(v => v.alert.id));
    const storeById = new Map(alerts.map(a => [a.id, a]));

    const next: MnAlertView[] = [];
    for (const v of current) {
      const fresh = storeById.get(v.alert.id);
      if (fresh) {
        v.alert = fresh;
      } else if (!v.leaving) {
        this.beginLeave(v);
      }
      next.push(v);
    }
    for (const a of alerts) {
      if (!existing.has(a.id)) {
        next.push({alert: a, leaving: false, dragging: false, drag: 0, fling: 0});
      }
    }
    this.views.set(next);
  }

  /** Flags a view as leaving and schedules its removal once the exit animation has run.
   *  Idempotent: a card already leaving (e.g. flung by a swipe) is left untouched, so a
   *  synchronous store re-emit cannot overwrite the swipe direction with the default fade. */
  private beginLeave(v: MnAlertView, fling?: number): void {
    if (v.leaving) return;
    v.leaving = true;
    v.dragging = false;
    if (fling !== undefined) v.fling = fling;

    const delay = this.prefersReducedMotion() ? 0 : MnAlertOutletComponent.EXIT_MS;
    const timer = setTimeout(() => this.removeView(v.alert.id), delay);
    this.exitTimers.set(v.alert.id, timer);
  }

  private removeView(id: MnAlertId): void {
    const timer = this.exitTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.exitTimers.delete(id);
    }
    this.views.update(list => list.filter(v => v.alert.id !== id));
  }

  // =========================
  // Swipe-to-dismiss
  // =========================

  onPointerDown(event: PointerEvent, v: MnAlertView): void {
    if (v.leaving) return;
    // Don't hijack a press that begins on an interactive control inside the alert.
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select')) return;
    if (event.button !== undefined && event.button !== 0) return;

    const coord = this.axisCoord(event);
    this.activeDrag = {
      view: v,
      startCoord: coord,
      lastSample: {c: coord, t: event.timeStamp},
      prevSample: {c: coord, t: event.timeStamp},
    };
    v.dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent, v: MnAlertView): void {
    const drag = this.activeDrag;
    if (!drag || drag.view !== v) return;
    const delta = this.axisCoord(event) - drag.startCoord;
    // Dismissal is one-directional: vertical (Apple) tracks upward only (clamp ≤ 0),
    // horizontal (Android/other) tracks rightward only (clamp ≥ 0). A drag the other way
    // rests at 0 and springs back.
    v.drag = this.vertical ? Math.min(0, delta) : Math.max(0, delta);
    drag.prevSample = drag.lastSample;
    drag.lastSample = {c: this.axisCoord(event), t: event.timeStamp};
  }

  onPointerUp(event: PointerEvent, v: MnAlertView): void {
    const drag = this.activeDrag;
    if (!drag || drag.view !== v) return;
    this.activeDrag = null;
    v.dragging = false;

    if (this.shouldDismiss(drag, v)) {
      // Fling the card the rest of the way off its edge, then dismiss through the store.
      // Vertical flings upward (off the top); horizontal flings rightward (off the right).
      const extent = this.viewportExtent() + Math.abs(v.drag);
      const fling = this.vertical ? -extent : extent;
      this.beginLeave(v, fling);
      this.store.dismiss(v.alert.id);
    } else {
      // Snap back to rest; the wrapper's transition eases the offset → 0.
      v.drag = 0;
    }
    // Notify: pointerup is template-bound (schedules CD), but the leave/snap mutations live
    // on the view object — re-set the signal so the new transform is reflected reliably.
    this.views.update(list => [...list]);
  }

  private shouldDismiss(
    drag: NonNullable<typeof this.activeDrag>,
    v: MnAlertView
  ): boolean {
    if (Math.abs(v.drag) > MnAlertOutletComponent.SWIPE_DISMISS_THRESHOLD) return true;
    const dt = drag.lastSample.t - drag.prevSample.t;
    const velocity = dt > 0 ? Math.abs(drag.lastSample.c - drag.prevSample.c) / dt : 0;
    return velocity > MnAlertOutletComponent.FLICK_VELOCITY
      && Math.abs(v.drag) > MnAlertOutletComponent.FLICK_MIN_DISTANCE;
  }

  // =========================
  // Template style helpers
  // =========================

  /** Offset transform for a card: the fling target while leaving via swipe, otherwise the
   *  live drag offset, translated along the active axis. Returns null when neither applies,
   *  letting the stylesheet own the default (fade-in-place) leave. */
  itemTransform(v: MnAlertView): string | null {
    if (v.leaving) {
      return v.fling !== 0 ? this.translate(v.fling) : null;
    }
    return v.drag !== 0 ? this.translate(v.drag) : null;
  }

  /** Fades a card toward a floor as it is dragged toward the dismiss threshold. Null (CSS
   *  owns opacity) when at rest or leaving. */
  itemOpacity(v: MnAlertView): number | null {
    if (v.leaving || !v.dragging || v.drag === 0) return null;
    const progress = Math.min(Math.abs(v.drag) / MnAlertOutletComponent.SWIPE_DISMISS_THRESHOLD, 1);
    return 1 - progress * (1 - MnAlertOutletComponent.DRAG_OPACITY_FLOOR);
  }

  private translate(px: number): string {
    return this.vertical ? `translateY(${px}px)` : `translateX(${px}px)`;
  }

  private axisCoord(event: PointerEvent): number {
    return this.vertical ? event.clientY : event.clientX;
  }

  private viewportExtent(): number {
    if (typeof window === 'undefined') return 400;
    return this.vertical ? window.innerHeight : window.innerWidth;
  }

  /** Whether the current device runs an Apple OS (iOS/iPadOS/macOS). iPadOS 13+ masquerades
   *  as a Mac, so it is caught by the touch-capable-Mac branch. */
  private detectApple(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent ?? '';
    const platform = navigator.platform ?? '';
    const isIOS = /iP(hone|ad|od)/.test(platform) || /iPad|iPhone|iPod/.test(ua);
    const isTouchMac = /Mac/.test(platform + ' ' + ua)
      && typeof document !== 'undefined' && 'ontouchend' in document;
    const isMac = /Mac/.test(ua);
    return isIOS || isTouchMac || isMac;
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
