import {tv, type VariantProps} from 'tailwind-variants';

export const mnCheckboxVariants = tv({
  base: '',
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

export const mnCheckboxWrapperVariants = tv({
  base: 'text-base-content',
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
    },
    fullWidth: {
      true: 'w-full',
    },
    hover: {
      true: 'hover:bg-base-200 rounded-md transition-colors duration-200 ease-in-out px-2 -mx-2',
    },
  },
  defaultVariants: {
    size: 'md',
    hover: false,
  },
});

export type MnCheckboxVariants = VariantProps<typeof mnCheckboxVariants>;
export type MnCheckboxWrapperVariants = VariantProps<typeof mnCheckboxWrapperVariants>;
