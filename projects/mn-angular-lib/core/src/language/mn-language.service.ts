import {ApplicationRef, inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, firstValueFrom, Observable} from 'rxjs';
import {MnTranslationMap, MnTranslations} from './mn-language.types';

/**
 * Key suffix per CLDR plural category.
 *
 * Only `one` earns a suffix: every locale shipped so far (`en`, `nl`) has exactly the two
 * categories `one` and `other`, and `other` keeps the bare key. A locale with `few`/`many`
 * (Polish, Russian, Arabic) resolves those to the plural until an entry is added here —
 * adding one is the whole change, since the lookup is category-driven already.
 */
const PLURAL_SUFFIX: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: 'One',
};

/** Params key whose presence turns a translation into a plural-aware lookup. */
const COUNT_PARAM = 'count';

@Injectable({ providedIn: 'root' })
export class MnLanguageService {
  private readonly http = inject(HttpClient);
  private readonly appRef = inject(ApplicationRef);

  private _translations: MnTranslations = {};
  private _locale$ = new BehaviorSubject<string>('en');
  private _urlPattern: string | null = null;
  private _debug = false;

  /**
   * `Intl.PluralRules` per locale. Cached because {@link translate} runs on every change
   * detection through the impure `mnTranslate` pipe, and constructing one is not cheap.
   */
  private readonly _pluralRules = new Map<string, Intl.PluralRules | null>();

  /** Observable of the current active locale. */
  readonly locale$: Observable<string> = this._locale$.asObservable();

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
    this.appRef.tick();
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
   *
   * A `count` param additionally selects the wording that agrees with it: the key is
   * resolved against its CLDR plural category first (`key` + `One`/`Two`/`Few`/`Many`/
   * `Zero`), falling back to `key` when that sibling is undefined. Nothing has to opt in —
   * a key with no sibling behaves exactly as before.
   *
   * ```ts
   * // 'shift.asked'    → '{{count}} members are notified'
   * // 'shift.askedOne' → '{{count}} member is notified'
   * lang.translate('shift.asked', { count: 3 }); // 3 members are notified
   * lang.translate('shift.asked', { count: 1 }); // 1 member is notified
   * ```
   */
  translate(key: string, params?: Record<string, string | number>): string {
    const map = this._translations[this.locale] ?? {};
    let value = this.getValueFromMap(map, this.resolvePluralKey(map, key, params));

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
   * Picks the wording that agrees with a `count` param.
   *
   * A key carrying a count resolves against its CLDR plural category first, so
   * `askedMessage` + `askedMessageOne` render "3 leden krijgen bericht" and "1 lid krijgt
   * bericht" off the same call. Both languages change the verb as well as the noun, which
   * is why each form is a whole sentence under its own key rather than a swapped noun.
   *
   * Falls back to `key` whenever the sibling is undefined, so a key that never needed a
   * plural — or an app that has not written one yet — behaves exactly as it did before.
   * @param map The active locale's translations.
   * @param key The dot-notated translation key.
   * @param params The interpolation values, inspected for `count`.
   * @returns The key to look up: the plural sibling, or `key` itself.
   */
  private resolvePluralKey(
    map: MnTranslationMap,
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const raw = params?.[COUNT_PARAM];
    if (raw === undefined) return key;

    // A count off a JSON payload arrives as a string often enough that comparing it
    // strictly would silently pick the plural for a count of one.
    const count = Number(raw);
    if (!Number.isFinite(count)) return key;

    const suffix = PLURAL_SUFFIX[this.pluralCategory(count)];
    if (suffix === undefined) return key;

    const variant = key + suffix;
    return this.getValueFromMap(map, variant) !== undefined ? variant : key;
  }

  /**
   * The CLDR plural category of a count in the active locale.
   * @param count The count being quoted.
   * @returns The category, falling back to English rules for an unusable locale.
   */
  private pluralCategory(count: number): Intl.LDMLPluralRule {
    if (!this._pluralRules.has(this.locale)) {
      try {
        this._pluralRules.set(this.locale, new Intl.PluralRules(this.locale));
      } catch {
        // An unknown or malformed locale tag: fall back rather than break every string.
        this._pluralRules.set(this.locale, null);
      }
    }
    const rules = this._pluralRules.get(this.locale);
    if (!rules) return count === 1 ? 'one' : 'other';
    return rules.select(count);
  }

  /**
   * Helper to retrieve a value from a potentially nested translation map using a dot-notated key.
   */
  private getValueFromMap(map: MnTranslationMap, key: string): string | undefined {
    // A flattened bundle holds the dotted key verbatim; a nested one is walked below.
    const direct = map[key];
    if (typeof direct === 'string') return direct;

    const parts = key.split('.');
    let current: MnTranslationMap | string | undefined = map;

    for (const part of parts) {
      if (current === null || typeof current !== 'object') return undefined;
      current = current[part];
    }

    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Translate a key **only if it is defined**, returning `undefined` otherwise.
   *
   * {@link translate} deliberately returns the key itself when it is missing, which
   * makes it unusable for a library's own default labels: a consumer that never
   * defined `mnCollection.rowsPerPage` would see that raw string in their UI. This
   * lets a caller try a conventional key and fall back to a readable English default
   * when the app has not translated it, so components ship translatable strings
   * without forcing every consumer to define them.
   *
   * @param key The dot-notated translation key.
   * @param params Optional `{{name}}` interpolation values.
   * @returns The translation, or `undefined` when the key is not defined.
   */
  translateIfPresent(key: string, params?: Record<string, string | number>): string | undefined {
    const map = this._translations[this.locale] ?? {};
    if (this.getValueFromMap(map, key) === undefined) return undefined;
    return this.translate(key, params);
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
