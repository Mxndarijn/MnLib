import { tv, type VariantProps } from 'tailwind-variants';

export const mnBadgeVariants = tv({
  base: 'inline-flex items-center rounded-md border font-semibold',
  variants: {
    size: {
      sm: 'px-1.5 py-0.5 text-xs',
      md: 'px-2 py-0.5 text-sm',
      lg: 'px-2.5 py-1 text-base',
      xl: 'px-3 py-1.5 text-lg',
    },

    variant: {
      default: '',
      fill: '',
    },

    wrap: {
      true: 'whitespace-normal',
      false: 'whitespace-nowrap',
    },

    color: {
      primary: '',
      secondary: '',
      danger: '',
      warning: '',
      success: '',
      accent: '',
      lightgray: '',
    },
  },

  compoundVariants: [
    // Default (tinted). A 10% wash with a 40% border, and the text in `--color-<colour>-text`
    // when the consuming app defines one (the darker/lighter shade it uses for readable coloured
    // text), falling back to the base colour otherwise. The former 20% wash with the base colour
    // as text sat at 2–4:1 on both light and dark grounds, under the WCAG AA 4.5:1 minimum.
    { variant: 'default', color: 'primary',   class: 'bg-primary/10 border-primary/40 text-(--color-primary-text,var(--color-primary))' },
    { variant: 'default', color: 'secondary', class: 'bg-secondary/10 border-secondary/40 text-(--color-secondary-text,var(--color-secondary))' },
    { variant: 'default', color: 'danger',    class: 'bg-error/10 border-error/40 text-(--color-error-text,var(--color-error))' },
    { variant: 'default', color: 'warning',   class: 'bg-warning/10 border-warning/40 text-(--color-warning-text,var(--color-warning))' },
    { variant: 'default', color: 'success',   class: 'bg-success/10 border-success/40 text-(--color-success-text,var(--color-success))' },
    { variant: 'default', color: 'accent',    class: 'bg-accent/10 border-accent/40 text-(--color-accent-text,var(--color-accent))' },
    { variant: 'default', color: 'lightgray', class: 'bg-base-content/10 border-base-content/70 text-base-content/70' },
    // Fill (solid)
    { variant: 'fill', color: 'primary',   class: 'bg-primary border-primary text-primary-content' },
    { variant: 'fill', color: 'secondary', class: 'bg-secondary border-secondary text-secondary-content' },
    { variant: 'fill', color: 'danger',    class: 'bg-error border-error text-error-content' },
    { variant: 'fill', color: 'warning',   class: 'bg-warning border-warning text-warning-content' },
    { variant: 'fill', color: 'success',   class: 'bg-success border-success text-success-content' },
    { variant: 'fill', color: 'accent',    class: 'bg-accent border-accent text-accent-content' },
    { variant: 'fill', color: 'lightgray', class: 'bg-base-content/70 border-base-content/70 text-base-100' },
  ],

  defaultVariants: {
    size: 'md',
    variant: 'default',
    color: 'primary',
    wrap: false,
  },
});

export type MnBadgeVariants = VariantProps<typeof mnBadgeVariants>;
