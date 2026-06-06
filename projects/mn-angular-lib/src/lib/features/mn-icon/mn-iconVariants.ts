import { tv, type VariantProps } from 'tailwind-variants';

export const mnIconVariants = tv({
  base: 'inline-flex shrink-0',
  variants: {
    color: {
      current: 'text-current',
      primary: 'text-primary',
      secondary: 'text-neutral',
      danger: 'text-error',
      warning: 'text-warning',
      success: 'text-success',
      accent: 'text-accent',
    },
  },

  defaultVariants: {
    color: 'current',
  },
});

export type MnIconVariants = VariantProps<typeof mnIconVariants>;
