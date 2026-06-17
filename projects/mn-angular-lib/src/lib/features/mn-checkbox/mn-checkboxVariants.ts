import {tv, type VariantProps} from 'tailwind-variants';

export const mnCheckboxVariants = tv({
  base: 'mn-checkbox',
  variants: {
    size: {
      xs: 'mn-checkbox-xs',
      sm: 'mn-checkbox-sm',
      md: 'mn-checkbox-md',
      lg: 'mn-checkbox-lg',
      xl: 'mn-checkbox-xl',
    },
    color: {
      primary: 'mn-checkbox-primary',
      secondary: 'mn-checkbox-secondary',
      accent: 'mn-checkbox-accent',
      neutral: 'mn-checkbox-neutral',
      info: 'mn-checkbox-info',
      success: 'mn-checkbox-success',
      warning: 'mn-checkbox-warning',
      error: 'mn-checkbox-error',
    },
    borderRadius: {
      none: 'mn-checkbox-radius-none',
      xs: 'mn-checkbox-radius-xs',
      sm: 'mn-checkbox-radius-sm',
      md: 'mn-checkbox-radius-md',
      lg: 'mn-checkbox-radius-lg',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'primary',
    borderRadius: 'sm',
  },
});

export const mnCheckboxWrapperVariants = tv({
  base: 'text-base-content',
  variants: {
    size: {
      xs: 'text-sm',
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-base',
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
