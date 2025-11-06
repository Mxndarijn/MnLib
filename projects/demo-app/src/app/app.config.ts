import { ApplicationConfig } from '@angular/core';
import { provideMnTheme } from 'mn-angular-lib';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Set a base theme for the demo (can be overridden at runtime in components)
    provideMnTheme({
      primary: '#0d6efd',
      radius: '0.5rem',
      padding: '0.5rem 0.75rem',
    }),
    provideRouter(routes),
  ]
};
