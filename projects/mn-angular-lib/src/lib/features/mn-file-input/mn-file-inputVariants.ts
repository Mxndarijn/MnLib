import {tv, type VariantProps} from 'tailwind-variants';

/**
 * Tailwind-variants definition for the MnFileInput component.
 *
 * Mirrors the styling vocabulary of {@link mnInputFieldVariants} (size,
 * borderRadius, shadow, fullWidth, disabled) so a file input visually matches the
 * rest of the input family, and adds a `dropzone` toggle for the large dashed
 * drop area used by the default display mode.
 */
export const mnFileInputVariants = tv({
  base: 'bg-base-100 border-1 border-base-300 text-base-content text-sm outline-none transition-colors duration-300 ease-in-out',
  variants: {
    /** Inner padding scale of the clickable control. */
    size: {
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
    },
    /** Corner rounding of the control. */
    borderRadius: {
      none: 'rounded-none',
      xs: 'rounded-xs',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      two_xl: 'rounded-2xl',
      three_xl: 'rounded-3xl',
      four_xl: 'rounded-4xl',
    },
    /** Drop shadow toggle. */
    shadow: {
      true: 'shadow-lg',
    },
    /** Stretch the control to the full width of its container. */
    fullWidth: {
      true: 'w-full',
    },
    /** Renders the control as a large dashed dropzone with a hover accent. */
    dropzone: {
      true: 'flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed text-center cursor-pointer hover:border-primary',
    },
    /** Dimmed, non-interactive appearance. */
    disabled: {
      true: 'opacity-50 cursor-not-allowed pointer-events-none',
    },
  },
  defaultVariants: {
    size: 'md',
    borderRadius: 'lg',
  },
});

/** Variant prop types derived from {@link mnFileInputVariants}. */
export type MnFileInputVariants = VariantProps<typeof mnFileInputVariants>;
