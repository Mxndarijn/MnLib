import { ApplicationConfig } from '@angular/core';
import { provideMnThemeDynamic, provideMnConfig } from 'mn-angular-lib';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    // HttpClient for config loading
    provideHttpClient(),

    // Load mn-config at app bootstrap
    ...provideMnConfig('assets/mn-config.json5'),

    // Set a base theme for the demo (can be overridden at runtime in components)
    provideMnThemeDynamic({
      primary: '#0d6efd',
      radius: '0.5rem',
      padding: '0.5rem 0.75rem',
    }),
    provideRouter(routes),
  ]
};
