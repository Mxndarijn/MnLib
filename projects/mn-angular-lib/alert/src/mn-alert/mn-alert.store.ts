import {inject, Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {MnAlert, MnAlertId} from './mn-alert.types';
import {DEFAULT_MN_ALERT_CONFIG, MN_ALERT_CONFIG, MnAlertConfig} from './mn-alert.tokens';

let COUNTER = 0;
const uid = () => `mn_${++COUNTER}`;

@Injectable({ providedIn: 'root' })
export class MnAlertStore {
  private readonly _alerts$ = new BehaviorSubject<MnAlert[]>([]);
  readonly alerts$ = this._alerts$.asObservable();

  /** Host configuration, when the app provided one. Only `maxVisible` is read here — the
   *  per-kind durations are resolved by {@link MnAlertService} before an alert reaches the store. */
  private readonly cfg = inject<MnAlertConfig | null>(MN_ALERT_CONFIG, {optional: true});

  /** In-flight auto-dismiss timers keyed by alert id, so an alert that leaves early (dismissed
   *  by hand, or pushed out by the visible cap) never fires a stale timeout later. */
  private readonly timers = new Map<MnAlertId, ReturnType<typeof setTimeout>>();

  /** How many alerts stay on screen at once; showing more drops the oldest ones. */
  private get maxVisible(): number {
    const configured = this.cfg?.maxVisible;
    return typeof configured === 'number' && configured > 0
      ? configured
      : DEFAULT_MN_ALERT_CONFIG.maxVisible;
  }

  show(partial: Omit<MnAlert, 'id'>): MnAlertId {
    // Ensure every alert has a numeric duration: use provided or fall back to per-kind default
    const computedDuration = (partial as {
      duration?: number
    }).duration ?? (DEFAULT_MN_ALERT_CONFIG.durations as Record<string, number>)[(partial as {
      kind?: string
    }).kind ?? ''] ?? DEFAULT_MN_ALERT_CONFIG.fallbackDuration;
    const a: MnAlert = { id: uid(), ...partial, duration: computedDuration } as MnAlert;

    // Newest alert last; anything beyond the cap is trimmed off the front (the oldest still
    // visible), so a burst of alerts scrolls rather than piling up.
    const queued = [...this._alerts$.value, a];
    const overflow = queued.length - this.maxVisible;
    if (overflow > 0) {
      queued.splice(0, overflow).forEach(dropped => this.clearTimer(dropped.id));
    }
    this._alerts$.next(queued);

    if (typeof a.duration === 'number' && a.duration > 0) {
      this.timers.set(a.id, setTimeout(() => this.dismiss(a.id), a.duration));
    }
    return a.id;
  }

  dismiss(id: MnAlertId) {
    const list = this._alerts$.value;
    if (list.some(x => x.id === id)) {
      this.clearTimer(id);
      this._alerts$.next(list.filter(x => x.id !== id));
    }
  }

  clear() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
    this._alerts$.next([]);
  }

  private clearTimer(id: MnAlertId) {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
