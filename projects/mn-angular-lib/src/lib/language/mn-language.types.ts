/**
 * A marker object used in config values to indicate that the value
 * should be resolved via the MnLanguageService.
 *
 * Example in mn-config.json5:
 *   label: { $translate: "form.email.label" }
 */
export interface MnTranslatable {
  $translate: string;
  params?: Record<string, string | number>;
}

/**
 * A config value that is either a plain value or a translatable marker.
 */
export type MnConfigValue<T = string> = T | MnTranslatable;

/**
 * A flat key-value map of translations for a single locale.
 * Supports nested keys via dot notation: "form.email.label"
 */
export type MnTranslationMap = Record<string, string>;

/**
 * All loaded translations keyed by locale code (e.g. "en", "nl", "de").
 */
export type MnTranslations = Record<string, MnTranslationMap>;

/**
 * Configuration for the language provider.
 */
export interface MnLanguageConfig {
  /** URL pattern for loading translation files. Use `{locale}` as placeholder. e.g. "assets/i18n/{locale}.json" */
  urlPattern: string;
  /** The default/fallback locale. */
  defaultLocale: string;
  /** Locales to preload at bootstrap. */
  preload?: string[];
  /**
   * Optional mapping of domain hostnames to locale codes.
   * When set, the service will use the current domain to determine the initial locale.
   * Example: { "example.nl": "nl", "example.de": "de", "example.com": "en" }
   */
  domainLocaleMap?: Record<string, string>;
  /** Whether to enable debug logging. */
  debug?: boolean;
}

/**
 * Type guard: checks whether a value is a translatable marker object.
 */
export function isTranslatable(value: unknown): value is MnTranslatable {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).$translate === 'string'
  );
}
