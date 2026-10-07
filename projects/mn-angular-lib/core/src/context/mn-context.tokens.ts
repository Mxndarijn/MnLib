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
 * Whether the injecting component renders inside an mn modal. `MnModalShellComponent` provides
 * `true` for everything in its view, so a component deep in a modal body can tell without the
 * consumer passing anything: mn-table uses it to skip its own bottom sheet, because a sheet
 * opened over a modal that is already a sheet on a phone stacks two drawers on one screen.
 */
export const MN_IN_MODAL = new InjectionToken<boolean>(
  'MN_IN_MODAL',
  {
    providedIn: 'root',
    factory: () => false,
  },
);

/**
 * Whether the injecting component renders inside an `mn-bottom-sheet`. The sheet provides `true`
 * to its content. mn-select and mn-multi-select read it: on a phone they normally open their
 * options as a bottom sheet of their own, which inside a sheet stacks a second one on top and
 * hides the form around it, so there they open as an anchored dropdown instead.
 */
export const MN_IN_BOTTOM_SHEET = new InjectionToken<boolean>(
  'MN_IN_BOTTOM_SHEET',
  {
    providedIn: 'root',
    factory: () => false,
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
