// projects/mn-angular-lib/src/lib/mn-mn-alert/mn-mn-alert.providers.ts
import { Provider } from '@angular/core';
import { MN_ALERT_CONFIG, MnAlertConfig, DEFAULT_MN_ALERT_CONFIG } from './mn-alert.tokens';

export function provideMnAlerts(config: MnAlertConfig = {}): Provider {
  const merged: MnAlertConfig = {
    ...DEFAULT_MN_ALERT_CONFIG,
    ...config,
    durations: { ...DEFAULT_MN_ALERT_CONFIG.durations, ...(config.durations ?? {}) },
    cssClasses: { ...DEFAULT_MN_ALERT_CONFIG.cssClasses, ...(config.cssClasses ?? {}) },
    icons: { ...DEFAULT_MN_ALERT_CONFIG.icons, ...(config.icons ?? {}) }
  };
  return { provide: MN_ALERT_CONFIG, useValue: merged };
}
