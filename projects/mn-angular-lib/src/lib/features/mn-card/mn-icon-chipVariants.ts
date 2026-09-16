import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Styling for {@link MnIconChip}: one 10% wash of the colour behind an icon drawn in
 * the consumer's `--color-<colour>-text` token when it defines one (the shade it uses
 * for readable coloured text on a tinted ground) and in the base colour otherwise, the
 * same device `mnBadge` uses. The radius grows with the box so the corner reads the
 * same at every size.
 */
export const mnIconChipVariants = tv({
  base: 'inline-flex shrink-0 items-center justify-center',
  variants: {
    /** `sm` for list rows, `md` for section-card headers and stat tiles, `lg` for page headers. */
    size: {
      sm: 'h-9 w-9 rounded-lg',
      md: 'h-10 w-10 rounded-xl',
      lg: 'h-12 w-12 rounded-2xl',
    },
    color: {
      primary: 'bg-primary/10 text-(--color-primary-text,var(--color-primary))',
      secondary: 'bg-secondary/10 text-(--color-secondary-text,var(--color-secondary))',
      accent: 'bg-accent/10 text-(--color-accent-text,var(--color-accent))',
      success: 'bg-success/10 text-(--color-success-text,var(--color-success))',
      warning: 'bg-warning/10 text-(--color-warning-text,var(--color-warning))',
      danger: 'bg-error/10 text-(--color-error-text,var(--color-error))',
      gray: 'bg-base-content/10 text-base-content/70',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'primary',
  },
});

export type MnIconChipVariants = VariantProps<typeof mnIconChipVariants>;
