import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { MnTheme, MN_THEME_DEFAULTS } from './themes';

@Injectable({ providedIn: 'root' })
export class MnThemeService {
  private readonly _theme: WritableSignal<MnTheme> = signal<MnTheme>(MN_THEME_DEFAULTS);

  theme = this._theme.asReadonly();

  setTheme(partial: Partial<MnTheme>) {
    const merged = { ...this._theme(), ...partial } as MnTheme;
    this._theme.set(merged);
  }

  setAll(next: MnTheme) {
    this._theme.set(next);
  }

  reset() {
    this._theme.set(MN_THEME_DEFAULTS);
  }
}

// Provider to initialize dynamic theme easily at component/app level
export function provideMnThemeDynamic(initial?: Partial<MnTheme>) {
  return {
    provide: MnThemeService,
    useFactory: () => {
      const svc = new MnThemeService();
      if (initial) {
        svc.setTheme({ ...initial });
      }
      return svc;
    }
  };
}
