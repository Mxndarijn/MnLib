import { APP_INITIALIZER, Provider } from '@angular/core';
import { MnLanguageService } from './mn-language.service';
import { MnLanguageConfig } from './mn-language.types';

/**
 * Provides an APP_INITIALIZER that configures the MnLanguageService and
 * preloads the requested locales during application bootstrap.
 *
 * Usage in app.config.ts:
 *   ...provideMnLanguage({
 *     urlPattern: 'assets/i18n/{locale}.json',
 *     defaultLocale: 'en',
 *     preload: ['en', 'nl'],
 *   })
 */
export function provideMnLanguage(config: MnLanguageConfig): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (svc: MnLanguageService) => async () => {
        svc.configure(config.urlPattern);

        const effectiveLocale = svc.resolveLocaleForDomain(config.domainLocaleMap, config.defaultLocale);
        const localesToLoad = config.preload ?? [effectiveLocale];
        await Promise.all(localesToLoad.map(l => svc.loadLocale(l)));
        await svc.setLocale(effectiveLocale);
      },
      deps: [MnLanguageService],
    },
  ];
}
