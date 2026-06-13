/**
 * Types for mn-lib configuration.
 */

export type MnConfigSettings = {
  /** Application or library version. */
  version?: string;
  /** Application or library name. */
  name?: string;
}

export type MnConfigFile = {
  /**
   * General settings such as version and name.
   */
  settings?: MnConfigSettings;
  /**
   * Base defaults by component name. Each value is a plain object with inputs/options for that component.
   */
  defaults: Record<string, unknown>;
  /**
   * Nested object tree keyed by section names. Leaf nodes may contain
   * component-name keys (component override objects) and keys starting with '#'
   * representing instance-id overrides.
   */
  overrides: unknown;
}
