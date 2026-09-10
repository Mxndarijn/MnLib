import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Styling for {@link MnSegmented}, expressed as tailwind-variants slots so the
 * template pulls one class string per role.
 *
 * The control is a track with the active choice raised out of it, rather than a
 * row of loose buttons: the segments share one bordered surface, so they read as
 * one control with one answer instead of several independent actions. Theme
 * tokens only, so it holds up in both light and dark.
 *
 * Each segment is an `mnButton`, which owns its own size, colour, radius and
 * disabled look; the `segment` slot adds only what the button does not know
 * about — how it sits inside the track.
 */
export const mnSegmentedVariants = tv({
  slots: {
    root: 'inline-flex items-center gap-0.5 border border-base-300 bg-base-200 p-0.5',
    segment:
      'gap-1.5 select-none ' +
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  },
  variants: {
    /**
     * Corner rounding of the track. The segments are rounded one step tighter
     * (see `SEGMENT_RADIUS` on the component) so a filled segment nests inside
     * the track's own corner instead of poking out of it. Token names match
     * mn-button's; `full` makes a pill, where track and segment share the same
     * fully-rounded ends.
     */
    borderRadius: {
      none: { root: 'rounded-none' },
      xs: { root: 'rounded-xs' },
      sm: { root: 'rounded-sm' },
      md: { root: 'rounded-md' },
      lg: { root: 'rounded-lg' },
      xl: { root: 'rounded-xl' },
      two_xl: { root: 'rounded-2xl' },
      three_xl: { root: 'rounded-3xl' },
      four_xl: { root: 'rounded-4xl' },
      full: { root: 'rounded-full' },
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
     * Whether the segment is the picked one. The colours come from the button
     * itself (a filled primary button when active, a ghost one otherwise); this
     * only keeps an inactive segment's box the same size as an active one, whose
     * fill variant carries a real border.
     */
    active: {
      true: {},
      false: { segment: 'border border-transparent' },
    },
  },
  defaultVariants: {
    borderRadius: 'lg',
    justified: false,
    active: false,
  },
});

export type MnSegmentedVariants = VariantProps<typeof mnSegmentedVariants>;
