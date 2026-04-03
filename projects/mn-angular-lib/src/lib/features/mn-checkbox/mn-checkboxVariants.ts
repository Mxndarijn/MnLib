import { tv, type VariantProps } from 'tailwind-variants';

export const mnCheckboxVariants = tv({
  base: 'accent-brand-500 cursor-pointer',
  variants: {
    size: {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    },
    borderRadius: {
      none: 'rounded-none',
      xs: 'rounded-xs',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
    },
  },
  defaultVariants: {
    size: 'md',
    borderRadius: 'sm',
  },
});

export type MnCheckboxVariants = VariantProps<typeof mnCheckboxVariants>;
