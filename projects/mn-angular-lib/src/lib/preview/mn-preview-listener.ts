import { MnConfigService } from '../config/mn-config.service';
import { MnLanguageService } from '../language/mn-language.service';

export type MnPreviewMessage = {
  type: 'mn-config-update' | 'mn-translations-update';
  config?: Record<string, unknown>;
  translations?: Record<string, Record<string, string>>;
}

/**
 * Enable live preview mode. Listens for postMessage events from
 * Mn Web Manager and hot-swaps config/translations at runtime.
 *
 * Call this once in your app's bootstrap (e.g., APP_INITIALIZER or root component).
 *
 * @param configService - The MnConfigService instance
 * @param langService - The MnLanguageService instance
 * @param allowedOrigins - Optional whitelist of allowed origins (security)
 */
export function enableMnPreviewMode(
  configService: MnConfigService,
  langService: MnLanguageService,
  allowedOrigins?: string[]
): void {
  window.addEventListener('message', async (event: MessageEvent<MnPreviewMessage>) => {
    if (allowedOrigins?.length && !allowedOrigins.includes(event.origin)) {
      return;
    }

    const data = event.data;
    if (!data?.type) return;

    switch (data.type) {
      case 'mn-config-update':
        if (data.config) {
          await configService.loadFromObject(data.config);
        }
        break;

      case 'mn-translations-update':
        if (data.translations) {
          for (const [locale, translations] of Object.entries(data.translations)) {
            langService.registerTranslations(locale, translations);
          }
          await langService.setLocale(langService.locale);
        }
        break;
    }
  });
}
