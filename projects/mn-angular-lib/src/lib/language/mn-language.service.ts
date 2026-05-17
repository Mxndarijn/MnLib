import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { MnTranslationMap, MnTranslations } from './mn-language.types';

@Injectable({ providedIn: 'root' })
export class MnLanguageService {
  private _translations: MnTranslations = {};
  private _locale$ = new BehaviorSubject<string>('en');
  private _urlPattern: string | null = null;
  private _debug = false;

  /** Observable of the current active locale. */
  readonly locale$: Observable<string> = this._locale$.asObservable();

  constructor(private readonly http: HttpClient) {}

  /** Current active locale. */
  get locale(): string {
    return this._locale$.value;
  }

  /**
   * Enable or disable debug logging.
   */
  setDebug(enabled: boolean): void {
    this._debug = enabled;
    if (enabled) {
      console.log(`[MnLanguage] Debug mode enabled`);
    }
  }

  /**
   * Configure the URL pattern used to fetch translation files.
   * Use `{locale}` as placeholder, e.g. `"assets/i18n/{locale}.json"`.
   */
  configure(urlPattern: string): void {
    if (this._debug) {
      console.log(`[MnLanguage] Configured urlPattern: ${urlPattern}`);
    }
    this._urlPattern = urlPattern;
  }

  /**
   * Load translations for a locale from the configured URL pattern.
   * If translations are already loaded for this locale, this is a no-op.
   */
  async loadLocale(locale: string): Promise<void> {
    if (this._translations[locale]) return;

    if (!this._urlPattern) {
      console.warn(`[MnLanguage] No URL pattern configured. Call configure() or use provideMnLanguage().`);
      return;
    }

    const url = this._urlPattern.replace('{locale}', locale);
    if (this._debug) {
      console.log(`[MnLanguage] Loading locale "${locale}" from ${url}`);
    }

    try {
      const map = await firstValueFrom(
        this.http.get<MnTranslationMap>(url)
      );
      this._translations[locale] = map ?? {};
      if (this._debug) {
        console.log(`[MnLanguage] Loaded locale "${locale}"`, this._translations[locale]);
      }
    } catch (err) {
      console.warn(`[MnLanguage] Failed to load translations from ${url}`, err);
      this._translations[locale] = {};
    }
  }

  /**
   * Switch the active locale. Loads translations if not yet loaded.
   */
  async setLocale(locale: string): Promise<void> {
    if (this._debug) {
      console.log(`[MnLanguage] Setting locale to "${locale}"`);
    }
    await this.loadLocale(locale);
    this._locale$.next(locale);
  }

  /**
   * Register translations for a locale directly from code (no HTTP needed).
   */
  registerTranslations(locale: string, translations: MnTranslationMap): void {
    this._translations[locale] = {
      ...(this._translations[locale] ?? {}),
      ...translations,
    };
  }

  /**
   * Translate a key using the current locale, with optional parameter interpolation.
   * Falls back to the key itself if no translation is found.
   *
   * Interpolation replaces `{{paramName}}` with the provided value.
   */
  translate(key: string, params?: Record<string, string | number>): string {
    const map = this._translations[this.locale] ?? {};
    let value = this.getValueFromMap(map, key);

    if (value === undefined) {
      if (this._debug) {
        console.warn(`[MnLanguage] Missing translation for key: "${key}" in locale: "${this.locale}"`);
      }
      return key;
    }

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
      }
    }

    return value;
  }

  /**
   * Helper to retrieve a value from a potentially nested translation map using a dot-notated key.
   */
  private getValueFromMap(map: any, key: string): string | undefined {
    if (map[key] !== undefined) return map[key];

    const parts = key.split('.');
    let current = map;

    for (const part of parts) {
      if (current === null || typeof current !== 'object') return undefined;
      current = current[part];
    }

    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Shorthand alias for `translate`.
   */
  t(key: string, params?: Record<string, string | number>): string {
    return this.translate(key, params);
  }

  /**
   * Resolve the effective default locale from a domain-to-locale map.
   * Matches `window.location.hostname` against the map keys.
   * Returns the mapped locale, or the provided fallback if no match is found.
   */
  resolveLocaleForDomain(domainLocaleMap: Record<string, string> | undefined, fallback: string): string {
    if (!domainLocaleMap || typeof window === 'undefined') return fallback;
    const hostname = window.location.hostname;
    return domainLocaleMap[hostname] ?? fallback;
  }
}
