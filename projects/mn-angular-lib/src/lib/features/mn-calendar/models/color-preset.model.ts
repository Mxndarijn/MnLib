/**
 * Colour scheme applied to calendar events.
 *
 * `primaryColor` is used for the left border accent; `secondaryColor` for the
 * background fill. Both should be valid CSS colour values.
 */
export interface ColorPreset {
  /** Unique identifier. */
  id: string;
  /** Human-readable colour name (e.g. "Blue"). */
  colorName: string;
  /** Accent / border colour (e.g. "#3b82f6"). */
  primaryColor: string;
  /** Background fill colour (e.g. "#dbeafe"). */
  secondaryColor: string;
}
