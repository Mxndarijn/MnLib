import { InjectionToken, Optional, Provider } from '@angular/core';
import { MN_INSTANCE_ID, MN_SECTION_PATH } from '../context/mn-context.tokens';
import { MnConfigService } from './mn-config.service';

/**
 * Helper to provide a resolved, typed component config via DI.
 *
 * Usage in a component/module providers:
 *   const MY_CFG = new InjectionToken<MyCfg>('MY_CFG');
 *   providers: [ provideMnComponentConfig(MY_CFG, 'my-component') ]
 * Then in the component:
 *   readonly cfg = inject(MY_CFG)
 */
export function provideMnComponentConfig<T extends object>(
  token: InjectionToken<T>,
  componentName: string,
  initial?: Partial<T>,
): Provider {
  return {
    provide: token,
    deps: [MnConfigService, [new Optional(), MN_SECTION_PATH], [new Optional(), MN_INSTANCE_ID]],
    useFactory: (svc: MnConfigService, sectionPath: string[] | null, instanceId: string | null): T => {
      const resolved = svc.resolve<T>(componentName, sectionPath ?? [], instanceId ?? undefined);
      // Apply optional initial (local defaults) over resolved? We prefer resolved to override initial local defaults,
      // so merge initial first, then resolved on top.
      return Object.assign({}, initial ?? {}, resolved);
    },
  };
}
