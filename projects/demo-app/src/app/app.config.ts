import { ApplicationConfig } from '@angular/core';
import {provideMnTheme, provideMnThemeDynamic} from 'mn-angular-lib';

export const appConfig: ApplicationConfig = {
  providers: [
    // Set a base theme for the demo (can be overridden at runtime in AppComponent)
    provideMnThemeDynamic({
      primary: '#fd0d0d',
      radius: '0.5rem',
      padding: '0.5rem 0.75rem',
    }),
  ]
};
