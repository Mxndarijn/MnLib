import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Styling for {@link MnSegmented}, expressed as tailwind-variants slots so the
 * template pulls one class string per role.
 *
 * The control is a track with the active choice raised out of it, rather than a
 * row of loose buttons: the segments share one bordered surface, so they read as
 * one control with one answer instead of several independent actions. Theme
 * tokens only, so it holds up in both light and dark.
 */
export const mnSegmentedVariants = tv({
  slots: {
    root: 'inline-flex items-center gap-0.5 border border-base-300 bg-base-200 p-0.5',
    segment:
      'inline-flex items-center justify-center gap-1.5 cursor-pointer select-none ' +
      'whitespace-nowrap border border-transparent transition-colors ' +
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
      'disabled:opacity-50 disabled:pointer-events-none',
  },
  variants: {
    /**
     * Corner rounding of the track, with the segments rounded one step tighter so
     * a filled segment nests inside the track's own corner instead of poking out
     * of it. Token names match mn-button's; `full` makes a pill, where track and
     * segment share the same fully-rounded ends.
     */
    borderRadius: {
      none: { root: 'rounded-none', segment: 'rounded-none' },
      xs: { root: 'rounded-xs', segment: 'rounded-none' },
      sm: { root: 'rounded-sm', segment: 'rounded-xs' },
      md: { root: 'rounded-md', segment: 'rounded-sm' },
      lg: { root: 'rounded-lg', segment: 'rounded-md' },
      xl: { root: 'rounded-xl', segment: 'rounded-lg' },
      two_xl: { root: 'rounded-2xl', segment: 'rounded-xl' },
      three_xl: { root: 'rounded-3xl', segment: 'rounded-2xl' },
      four_xl: { root: 'rounded-4xl', segment: 'rounded-3xl' },
      full: { root: 'rounded-full', segment: 'rounded-full' },
    },
    size: {
      sm: { segment: 'px-2.5 py-1 text-sm' },
      md: { segment: 'px-3 py-1.5 text-base' },
    },
    /**
     * Stretch the track and share its width evenly between the segments.
     *
     * The segments grow from a zero basis but keep their automatic minimum, so a
     * justified control inside an auto-width parent still asks for the room its
     * labels need. Letting them shrink below their content (`min-w-0`) made the
     * parent resolve to a narrower box and truncated the labels instead.
     */
    justified: {
      true: { root: 'flex w-full', segment: 'flex-1' },
      false: {},
    },
    /**
     * The picked segment. Filled rather than merely tinted: the control is often
     * the only thing on its row, so the answer has to be readable at a glance
     * without comparing two subtle shades.
     */
    active: {
      true: { segment: 'bg-primary text-primary-content' },
      false: { segment: 'bg-transparent text-base-content hover:bg-base-content/10' },
    },
  },
  defaultVariants: {
    size: 'md',
    borderRadius: 'lg',
    justified: false,
    active: false,
  },
});

export type MnSegmentedVariants = VariantProps<typeof mnSegmentedVariants>;
