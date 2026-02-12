import { APP_INITIALIZER, Provider } from '@angular/core';
import { MnConfigService } from './mn-config.service';

/**
 * Provides an APP_INITIALIZER that loads the mn-lib configuration from the given URL
 * during application bootstrap. The consuming application is responsible for providing
 * HttpClient (e.g., via HttpClientModule or provideHttpClient()).
 */
export function provideMnConfig(url: string, debugMode = false): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (svc: MnConfigService) => () => svc.load(url, debugMode),
      deps: [MnConfigService],
    },
  ];
}
