import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideMnThemeDynamic, MN_ALERT_REGISTRY_PROVIDER, MN_ALERT_ENTRY, provideMnConfig, provideMnDynamicTokens } from 'mn-angular-lib';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    // Set a base theme for the demo (can be overridden at runtime in components)
    provideMnThemeDynamic({
      primary: '#0d6efd',
      radius: '0.5rem',
      padding: '0.5rem 0.75rem',
    }),
    // Register mn-alert in the config registry
    MN_ALERT_REGISTRY_PROVIDER,
    // Configure MnConfigService to talk to the dev Flask backend and load values at startup
    ...provideMnConfig({ baseUrl: 'http://127.0.0.1:5000', tenant: 'default', env: 'dev' }),
    // Wire DI tokens for all registry entries (currently just mn-alert)
    ...provideMnDynamicTokens([MN_ALERT_ENTRY]),
    provideRouter(routes),
  ]
};
