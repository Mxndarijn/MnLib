import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Styling for {@link MnCard}, as tailwind-variants slots: `root` is the card element
 * itself, `accent` the optional bar along its top edge, `header` the heading row and
 * `title` the `h2` inside it.
 *
 * Theme tokens only, so the card holds up in light and dark. The surface reads the
 * consumer's `--color-base-card` when it defines one (a card ground a step off the
 * page background) and falls back to `base-100` otherwise, the same fallback device
 * `mnBadge` uses for its `-text` tokens.
 */
export const mnCardVariants = tv({
  slots: {
    root:
      'relative flex overflow-hidden border border-base-300 ' +
      'bg-(--color-base-card,var(--color-base-100)) transition-all duration-200 motion-reduce:transition-none',
    accent: 'absolute inset-x-0 top-0 h-1',
    header: 'flex flex-wrap items-center gap-3',
    title: 'text-lg font-semibold text-base-content',
  },
  variants: {
    /**
     * Inner padding, and with it the gap between the card's children: a tile needs
     * less air than a section card, and a section card that had to say `gap-4` on
     * every use would drift.
     */
    padding: {
      sm: { root: 'p-4 gap-3' },
      md: { root: 'p-5 gap-4' },
      lg: { root: 'p-6 gap-5' },
    },
    /** How the children flow: stacked (the default) or on one line, centred. */
    layout: {
      column: { root: 'flex-col' },
      row: { root: 'flex-row items-center' },
    },
    /**
     * Hover response. `shadow` is a little depth for a card that only sits there;
     * `lift` promises a destination and belongs on a card that is a link.
     */
    hover: {
      none: {},
      shadow: { root: 'hover:shadow-md' },
      lift: { root: 'hover:-translate-y-1 hover:shadow-lg' },
    },
    /**
     * Entrance. `rise` plays the consumer's `--animate-rise` keyframes when its theme
     * defines them (a short rise-in, delayed per card through
     * {@link MnCard.enterDelayMs}) and is a no-op otherwise; reduced-motion users
     * never see it.
     */
    enter: {
      none: {},
      rise: { root: 'animate-rise motion-reduce:animate-none' },
    },
    /** Corner rounding, in mn-button's radius tokens. */
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
    },
    /**
     * Colour of the accent bar and of the heading's icon chip: the same palette as
     * mn-button and the icon chip. What the colour *means* (a kind, a status, a
     * module) is the consumer's choice; the card only renders it.
     */
    color: {
      primary: { accent: 'bg-primary' },
      secondary: { accent: 'bg-secondary' },
      accent: { accent: 'bg-accent' },
      success: { accent: 'bg-success' },
      warning: { accent: 'bg-warning' },
      danger: { accent: 'bg-error' },
      gray: { accent: 'bg-base-content/30' },
    },
  },
  defaultVariants: {
    padding: 'sm',
    layout: 'column',
    hover: 'shadow',
    enter: 'rise',
    borderRadius: 'two_xl',
    color: 'primary',
  },
});

export type MnCardVariants = VariantProps<typeof mnCardVariants>;
