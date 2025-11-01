// projects/mn-angular-lib/src/lib/mn-mn-alert/mn-mn-alert.tokens.ts
import { InjectionToken } from '@angular/core';
import { MnAlert } from './mn-alert.types';

export type MnAlertKind = 'success' | 'info' | 'warning' | 'error' | 'default';

export interface MnAlertConfig {
  durations?: Partial<Record<MnAlertKind, number | null>>;
  cssClasses?: Partial<Record<MnAlertKind, string>>;
  icons?: Partial<Record<MnAlertKind, unknown>>;
  defaultDuration?: number | null;
  finalize?: (a: MnAlert) => MnAlert;
}

export const MN_ALERT_CONFIG = new InjectionToken<MnAlertConfig>('MN_ALERT_CONFIG');

export const DEFAULT_MN_ALERT_CONFIG: Required<MnAlertConfig> = {
  durations: { success: 3000, info: 4000, warning: 5000, error: 7000, default: 4000 },
  cssClasses: {
    success: 'mn-alert-success',
    info: 'mn-alert-info',
    warning: 'mn-alert-warning',
    error: 'mn-alert-error',
    default: 'alert'
  },
  icons: {},
  defaultDuration: 4000,
  finalize: (a) => a
};
