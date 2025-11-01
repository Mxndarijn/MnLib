import { ApplicationConfig } from '@angular/core';
import { provideMnTheme } from 'mn-angular-lib';

export const appConfig: ApplicationConfig = {
  providers: [
    // Set a base theme for the demo (can be overridden at runtime in AppComponent)
    provideMnTheme({
      primary: '#0d6efd',
      radius: '0.5rem',
      padding: '0.5rem 0.75rem',
    }),
  ]
};
