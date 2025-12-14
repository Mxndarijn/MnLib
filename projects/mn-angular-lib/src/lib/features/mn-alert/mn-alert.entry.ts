import { ComponentConfigEntry, MN_CONFIG_REGISTRY } from '../../config';
import { MN_ALERT_CONFIG, DEFAULT_MN_ALERT_CONFIG, MnAlertConfig } from './mn-alert.tokens';
import { Provider } from '@angular/core';

export const MN_ALERT_ENTRY: ComponentConfigEntry<Required<MnAlertConfig>> = {
  key: 'mn-alert',
  token: MN_ALERT_CONFIG,
  defaultValue: DEFAULT_MN_ALERT_CONFIG,
};

export const MN_ALERT_REGISTRY_PROVIDER: Provider = {
  provide: MN_CONFIG_REGISTRY,
  multi: true,
  useValue: MN_ALERT_ENTRY,
};
