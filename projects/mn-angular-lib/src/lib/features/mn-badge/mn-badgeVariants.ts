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
    // Default (light/transparent)
    { variant: 'default', color: 'primary',   class: 'bg-primary/20 border-primary text-primary' },
    { variant: 'default', color: 'secondary', class: 'bg-neutral/20 border-neutral text-neutral' },
    { variant: 'default', color: 'danger',    class: 'bg-error/20 border-error text-error' },
    { variant: 'default', color: 'warning',   class: 'bg-warning/20 border-warning text-warning' },
    { variant: 'default', color: 'success',   class: 'bg-success/20 border-success text-success' },
    { variant: 'default', color: 'accent',    class: 'bg-accent/20 border-accent text-accent' },
    { variant: 'default', color: 'lightgray', class: 'bg-base-content/10 border-base-content/70 text-base-content/70' },
    // Fill (solid)
    { variant: 'fill', color: 'primary',   class: 'bg-primary border-primary text-primary-content' },
    { variant: 'fill', color: 'secondary', class: 'bg-neutral border-neutral text-neutral-content' },
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
