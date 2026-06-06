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

    wrap: {
      true: 'whitespace-normal',
      false: 'whitespace-nowrap',
    },

    color: {
      primary: 'bg-primary/20 border-primary text-primary',
      secondary: 'bg-neutral/20 border-neutral text-neutral',
      danger: 'bg-error/20 border-error text-error',
      warning: 'bg-warning/20 border-warning text-warning',
      success: 'bg-success/20 border-success text-success',
      accent: 'bg-accent/20 border-accent text-accent',
      lightgray: 'bg-base-content/20 border-base-content text-base-content/70',
    },
  },

  defaultVariants: {
    size: 'md',
    color: 'primary',
    wrap: false,
  },
});

export type MnBadgeVariants = VariantProps<typeof mnBadgeVariants>;
