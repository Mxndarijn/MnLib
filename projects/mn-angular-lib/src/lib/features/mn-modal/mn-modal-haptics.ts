import {InjectionToken} from '@angular/core';

/**
 * Intensity of a haptic impact. Mirrors the three impact weights exposed by most
 * native haptic engines (e.g. Capacitor Haptics `ImpactStyle`) without binding the
 * library to any particular implementation.
 */
export type MnHapticStyle = 'light' | 'medium' | 'heavy';

/**
 * Abstraction over a native haptic feedback engine.
 *
 * The modal feature deliberately does NOT depend on Capacitor (or any other native
 * bridge) so the library stays usable in plain web apps. Consumers that run inside a
 * native shell provide an implementation of this handler through {@link MN_HAPTICS};
 * when no handler is provided the modal simply skips haptic feedback.
 */
export type MnHapticsHandler = {
  /**
   * Triggers a transient impact-style haptic.
   * @param style Intensity of the impact.
   */
  impact(style: MnHapticStyle): void;
}

/**
 * Optional DI token used by the bottom sheet to emit haptic feedback on native
 * platforms (sheet open, swipe-dismiss, and snap-back). Provide a {@link MnHapticsHandler}
 * at the application root to enable it; leave unprovided on the web (the modal injects it
 * with `{ optional: true }` and no-ops when absent).
 */
export const MN_HAPTICS = new InjectionToken<MnHapticsHandler>('MN_HAPTICS');
