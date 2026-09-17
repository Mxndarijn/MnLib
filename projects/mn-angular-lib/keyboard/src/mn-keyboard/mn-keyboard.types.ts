/**
 * Which keys a {@link MnKeyboard} renders.
 *
 * `alphanumeric` is the full QWERTY block with a digit row on top — the layout for
 * a field that accepts either a membership number or a name. `numeric` is a phone-
 * style 3x4 pad for digits only. `alpha` drops the digit row for name-only fields.
 */
export type MnKeyboardLayout = 'alphanumeric' | 'numeric' | 'alpha';

/**
 * How a {@link MnKeyboard} presents itself.
 *
 * `inline` renders the keys in normal document flow. `sheet` mounts them in an
 * {@link MnBottomSheet}, so the keyboard rises from the bottom of the screen over
 * whatever the user was looking at and can be swiped away.
 */
export type MnKeyboardPresentation = 'inline' | 'sheet';

/**
 * Labels for a {@link MnKeyboard}'s named keys.
 *
 * Supplied by the consumer rather than defaulted in the component: the library
 * ships no user-facing English, so the host app translates these in its own
 * bundles. The character keys need no labels — a digit and a letter read the same
 * in every supported language.
 */
export type MnKeyboardLabels = {
  /** The backspace key (also its accessible name). */
  backspace: string;
  /** The clear-everything key. */
  clear: string;
  /** The space key. */
  space: string;
  /** The confirm/submit key. */
  submit: string;
  /** Accessible name for the keyboard as a whole. */
  keyboard: string;
};
