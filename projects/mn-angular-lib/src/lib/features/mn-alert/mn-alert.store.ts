import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MnAlert, MnAlertId } from './mn-alert.types';
import { DEFAULT_MN_ALERT_CONFIG } from './mn-alert.tokens';

let COUNTER = 0;
const uid = () => `mn_${++COUNTER}`;

@Injectable({ providedIn: 'root' })
export class MnAlertStore {
  private readonly _alerts$ = new BehaviorSubject<MnAlert[]>([]);
  readonly alerts$ = this._alerts$.asObservable();

  show(partial: Omit<MnAlert, 'id'>): MnAlertId {
    // Ensure every alert has a numeric duration: use provided or fall back to per-kind default
    const computedDuration = (partial as any).duration ?? (DEFAULT_MN_ALERT_CONFIG.durations as any)[(partial as any).kind] ?? DEFAULT_MN_ALERT_CONFIG.fallbackDuration;
    const a: MnAlert = { id: uid(), ...partial, duration: computedDuration } as MnAlert;
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
