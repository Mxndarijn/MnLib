import { InjectionToken, inject, Signal, computed } from '@angular/core';
import { MnThemeService } from './theme.service';

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

export function injectTheme(): MnTheme {
  const t = inject<MnTheme>(MN_THEME, { optional: true });
  return t ?? MN_THEME_DEFAULTS;
}

/** Reactive variant: altijd een Signal<MnTheme> teruggeven */
export function injectThemeSignal(): Signal<MnTheme> {
  const svc = inject(MnThemeService, { optional: true });

  if (svc) {
    return (('asReadonly' in svc.theme) ? (svc.theme as any).asReadonly() : svc.theme) as Signal<MnTheme>;
  }
  const snap = injectTheme();
  return computed(() => snap);
}
