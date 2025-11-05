  import { InjectionToken, inject } from '@angular/core';

  export interface MnTheme {
    primary: string;
    radius: string;
    padding: string;
  }

  export const MN_THEME_DEFAULTS: MnTheme = {
    primary: '#0d6efd',
    radius: '0.375rem',
    padding: '0.5rem 0.75rem',
  };

  export const MN_THEME = new InjectionToken<MnTheme>('MN_THEME', {
    providedIn: 'root',
    factory: () => MN_THEME_DEFAULTS,
  });

  export function provideMnTheme(partial: Partial<MnTheme>) {
    return {
      provide: MN_THEME,
      useValue: { ...MN_THEME_DEFAULTS, ...partial },
    };
  }
