import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { MnTheme, MN_THEME_DEFAULTS } from './themes';

/**
 * MnThemeService is responsible for managing the theme configuration of the application.
 * It provides methods to modify, reset, and access the current theme state.
 *
 * The theming is handled using a WritableSignal object, enabling reactive updates to the theme properties.
 */
@Injectable({ providedIn: 'root' })
export class MnThemeService {
  private readonly _theme: WritableSignal<MnTheme> = signal<MnTheme>(MN_THEME_DEFAULTS);

  theme = this._theme.asReadonly();

  /**
   * Updates the current theme by merging the provided partial theme properties with the existing theme.
   *
   * @param {Partial<MnTheme>} partial - An object containing partial theme properties to update the current theme.
   * @return {void} No return value.
   */
  setTheme(partial: Partial<MnTheme>) {
    const merged = { ...this._theme(), ...partial } as MnTheme;
    this._theme.set(merged);
  }

  /**
   * Sets the provided theme as the current theme.
   *
   * @param {MnTheme} next - The new theme to be set.
   * @return {void} This method does not return a value.
   */
  setAll(next: MnTheme) {
    this._theme.set(next);
  }

  /**
   * Resets the theme configuration to its default values.
   * This method updates the theme settings to reflect the predefined default theme constants.
   *
   * @return {void} Does not return any value.
   */
  reset() {
    this._theme.set(MN_THEME_DEFAULTS);
  }
}

/**
 * Provides a dynamically configurable theme service for the MnTheme module.
 * This function creates an Angular provider with a factory for initializing
 * the MnThemeService. If an initial theme configuration is supplied, it
 * will be used to set the theme upon service creation.
 *
 * @param {Partial<MnTheme>} [initial] An optional partial configuration object
 * for initializing the theme within the MnThemeService.
 * @return {Object} An object containing the provider configuration for the MnThemeService.
 */
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
