import { InjectionToken, inject, Signal, computed } from '@angular/core';
import { MnThemeService } from './theme.service';

/**
 * Represents the theme configuration for a UI component or application.
 *
 * This interface defines the structure for theming properties such as primary colors,
 * border radius, and padding specifications. It allows customization of visual appearance.
 *
 * Properties:
 * - `primary`: Specifies the primary color used in the theme, represented as a string.
 * - `radius`: Defines the border radius applied to elements for rounded corners, represented as a string.
 * - `padding`: Determines the default padding size for elements, represented as a string.
 */
export interface MnTheme {
  primary: string;
  radius: string;
  padding: string;
}

/**
 * Default theme configuration object for the MN framework.
 *
 * This variable contains the default values for the theme, including primary color,
 * border radius, and padding. The values are retrieved using the `getCssVar` function,
 * which falls back to predefined default values if the corresponding CSS variables are not set.
 *
 * Properties:
 * - `primary`: The primary color used across the theme.
 * - `radius`: The border radius applied to UI elements.
 * - `padding`: The default padding applied to components.
 */
export const MN_THEME_DEFAULTS: MnTheme = {
  primary: getCssVar('--mn-primary', '#ff0000'),
  radius: getCssVar('--mn-radius', '0.375rem'),
  padding: getCssVar('--mn-padding', '0.5rem 0.75rem'),
};

/**
 * Retrieves the value of a CSS variable from the root element.
 *
 * @param {string} name - The name of the CSS variable to retrieve, including the leading '--'.
 * @param {string} [fallback=''] - The fallback value to return if the variable is not set or empty.
 * @return {string} The value of the CSS variable, trimmed of whitespace. Returns the fallback value if the variable is not set.
 */
function getCssVar(name: string, fallback: string = ''): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return value ? value.trim() : fallback;
}

/**
 * Injection token used to provide a customizable theme configuration for the application.
 *
 * This token allows the injection of a theme object that can be used application-wide
 * for defining consistent styles, colors, and other design-related settings. By default,
 * it uses the fallback configuration `MN_THEME_DEFAULTS`.
 *
 * Scope: The token is provided in the root injector, ensuring it is available
 * throughout the application.
 *
 * Factory: The default factory function returns the value of `MN_THEME_DEFAULTS`,
 * providing a default theme configuration if no custom theme is explicitly provided.
 */
export const MN_THEME = new InjectionToken<MnTheme>('MN_THEME', {
  providedIn: 'root',
  factory: () => MN_THEME_DEFAULTS,
});

/**
 * Provides a theme configuration by merging the partial values with the default theme values.
 *
 * @param {Partial<MnTheme>} partial - A partial MnTheme object containing theme customizations.
 * @return {object} An object with provide and useValue properties to configure the theme.
 */
export function provideMnTheme(partial: Partial<MnTheme>) {
  return {
    provide: MN_THEME,
    useValue: { ...MN_THEME_DEFAULTS, ...partial },
  };
}

/**
 * Injects the theme configuration into the application.
 * This method attempts to retrieve a theme instance from the dependency injection system.
 * If no theme instance is found, it falls back to default theme settings.
 *
 * @return {MnTheme} The injected theme instance or the default theme settings.
 */
export function injectTheme(): MnTheme {
  const t = inject<MnTheme>(MN_THEME, { optional: true });
  return t ?? MN_THEME_DEFAULTS;
}

/**
 * Injects a theme signal, allowing access to the current theme state.
 * This method retrieves the theme signal from the MnThemeService, if available.
 * If the service is not available, it falls back to a computed snapshot of the theme.
 *
 * @return {Signal<MnTheme>} The theme signal representing the current theme.
 */
export function injectThemeSignal(): Signal<MnTheme> {
  const svc = inject(MnThemeService, { optional: true });

  if (svc) {
    return (('asReadonly' in svc.theme) ? (svc.theme as any).asReadonly() : svc.theme) as Signal<MnTheme>;
  }
  const snap = injectTheme();
  return computed(() => snap);
}
