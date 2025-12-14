import { Injectable, Inject, Optional } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MnAlert, MnAlertId } from './mn-alert.types';
import { DEFAULT_MN_ALERT_CONFIG, MN_ALERT_CONFIG, MnAlertConfig } from './mn-alert.tokens';

let COUNTER = 0;
const uid = () => `mn_${++COUNTER}`;

@Injectable({ providedIn: 'root' })
export class MnAlertStore {
  private readonly _alerts$ = new BehaviorSubject<MnAlert[]>([]);
  readonly alerts$ = this._alerts$.asObservable();

  constructor(@Optional() @Inject(MN_ALERT_CONFIG) private cfg?: MnAlertConfig) {
    console.log('[MnAlertStore] Injected MN_ALERT_CONFIG =', this.cfg ?? DEFAULT_MN_ALERT_CONFIG);
  }

  show(partial: Omit<MnAlert, 'id'>): MnAlertId {
    const config = this.cfg ?? DEFAULT_MN_ALERT_CONFIG;
    // Ensure every alert has a numeric duration: use provided or fall back to per-kind default
    const perKind = (config.durations as any)[(partial as any).kind];
    const computedDuration = (partial as any).duration ?? perKind ?? config.fallbackDuration;
    const a: MnAlert = { id: uid(), ...partial, duration: computedDuration } as MnAlert;
    console.log('[MnAlertStore] show() kind=', (partial as any).kind, 'computedDuration=', computedDuration, 'config=', config);
    this._alerts$.next([...this._alerts$.value, a]);

    if (typeof a.duration === 'number' && a.duration > 0) {
      setTimeout(() => this.dismiss(a.id), a.duration);
    }
    return a.id;
  }

  dismiss(id: MnAlertId) {
    const list = this._alerts$.value;
    if (list.some(x => x.id === id)) {
      this._alerts$.next(list.filter(x => x.id !== id));
    }
  }

  clear() {
    this._alerts$.next([]);
  }
}
