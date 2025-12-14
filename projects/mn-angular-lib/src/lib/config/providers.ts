import { APP_INITIALIZER, Provider } from '@angular/core';
import { MnConfigService } from './mn-config.service';
import { ComponentConfigEntry } from './config-registry';

export function provideMnConfig(options: { baseUrl: string; tenant: string; env: string }): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [MnConfigService],
      useFactory: (svc: MnConfigService) => () => {
        console.log('[provideMnConfig] configuring with', options);
        return svc.configure(options);
      },
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [MnConfigService],
      useFactory: (svc: MnConfigService) => () => {
        console.log('[provideMnConfig] loading effective config at bootstrap');
        return svc.loadAllEffective();
      },
    },
  ];
}

export function provideMnDynamicTokens(entries: ComponentConfigEntry<any>[]): Provider[] {
  const registry = entries ?? [];
  return (registry as ComponentConfigEntry<any>[]).map(entry => ({
    provide: entry.token,
    deps: [MnConfigService],
    useFactory: (svc: MnConfigService) => {
      const eff = svc.effective(entry.key);
      console.log('[provideMnDynamicTokens] Providing token for key=', entry.key, 'value=', eff);
      return eff;
    },
  }));
}
