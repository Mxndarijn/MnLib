import { ApplicationConfig } from '@angular/core';
import { provideMnConfig, provideMnLanguage } from 'mn-angular-lib';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    // HttpClient for config loading
    provideHttpClient(),

    // Provide a default language config as fallback/early init
    ...provideMnLanguage({
      urlPattern: 'assets/i18n/{locale}.json',
      defaultLocale: 'en',
    }),

    // Load mn-config at app bootstrap
    ...provideMnConfig('assets/mn-config.json5'),

    // Set a base theme for the demo (can be overridden at runtime in components)

    provideRouter(routes),
  ]
};
