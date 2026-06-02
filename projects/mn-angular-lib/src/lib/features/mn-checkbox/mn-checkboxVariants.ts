import {tv, type VariantProps} from 'tailwind-variants';

export const mnCheckboxVariants = tv({
  base: 'checkbox checkbox-primary cursor-pointer',
  variants: {
    size: {
      sm: 'checkbox-sm',
      md: 'checkbox-md',
      lg: 'checkbox-lg',
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
