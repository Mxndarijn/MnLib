import { InjectionToken } from '@angular/core';

/**
 * Represents the current section path based on nested mn-section directives.
 */
export const MN_SECTION_PATH = new InjectionToken<string[]>(
  'MN_SECTION_PATH',
  {
    providedIn: 'root',
    factory: () => [],
  },
);

/**
 * Represents the current component instance id provided by [mn-instance].
 */
export const MN_INSTANCE_ID = new InjectionToken<string | null>(
  'MN_INSTANCE_ID',
  {
    providedIn: 'root',
    factory: () => null,
  },
);
