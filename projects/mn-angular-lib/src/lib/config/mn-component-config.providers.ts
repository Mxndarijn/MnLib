import { DestroyRef, InjectionToken, Optional, Provider } from '@angular/core';
import { MN_INSTANCE_ID, MN_SECTION_PATH } from '../context/mn-context.tokens';
import { MnConfigService } from './mn-config.service';
import { MnLanguageService } from '../language/mn-language.service';
import { skip } from 'rxjs';

/**
 * Helper to provide a resolved, typed component config via DI.
 *
 * Usage in a component/module providers:
 *   const MY_CFG = new InjectionToken<MyCfg>('MY_CFG');
 *   providers: [ provideMnComponentConfig(MY_CFG, 'my-component') ]
 * Then in the component:
 *   readonly cfg = inject(MY_CFG)
 *
 * The returned config object is **reactive**: when the active locale changes,
 * all translatable values are re-resolved in place so that templates using
 * `cfg.someLabel` automatically reflect the new language on the next change-detection cycle.
 */
export function provideMnComponentConfig<T extends object>(
  token: InjectionToken<T>,
  componentName: string,
  initial?: Partial<T>,
): Provider {
  return {
    provide: token,
    deps: [
      MnConfigService,
      MnLanguageService,
      DestroyRef,
      [new Optional(), MN_SECTION_PATH],
      [new Optional(), MN_INSTANCE_ID],
    ],
    useFactory: (
      svc: MnConfigService,
      lang: MnLanguageService,
      destroyRef: DestroyRef,
      sectionPath: string[] | null,
      instanceId: string | null,
    ): T => {
      const resolveConfig = (): T => {
        const resolved = svc.resolve<T>(componentName, sectionPath ?? [], instanceId ?? undefined);
        return Object.assign({}, initial ?? {}, resolved);
      };

      // Create the initial config object that will be shared by reference.
      const cfg = resolveConfig();

      // Re-resolve translatable values whenever the locale changes.
      // skip(1) because the current locale was already used for the initial resolve.
      const sub = lang.locale$.subscribe(() => {
        const updated = resolveConfig();
        // Mutate the existing object in place so all template bindings pick up the new values.
        for (const key of Object.keys(updated) as Array<keyof T>) {
          (cfg as any)[key] = (updated as any)[key];
        }
      });

      destroyRef.onDestroy(() => sub.unsubscribe());

      return cfg;
    },
  };
}
