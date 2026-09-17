import {tv, type VariantProps} from 'tailwind-variants';

export const mnCheckboxVariants = tv({
  base: 'mn-checkbox',
  variants: {
    size: {
      xs: 'size-4 p-0.5',
      sm: 'size-5 p-[0.1875rem]',
      md: 'size-6 p-1',
      lg: 'size-7 p-[0.3125rem]',
      xl: 'size-8 p-1.5',
    },
    color: {
      primary:   'border-primary   checked:bg-primary   indeterminate:bg-primary   focus-visible:outline-primary   text-primary-content',
      secondary: 'border-secondary checked:bg-secondary indeterminate:bg-secondary focus-visible:outline-secondary text-secondary-content',
      accent:    'border-accent    checked:bg-accent    indeterminate:bg-accent    focus-visible:outline-accent    text-accent-content',
      neutral:   'border-neutral   checked:bg-neutral   indeterminate:bg-neutral   focus-visible:outline-neutral   text-neutral-content',
      info:      'border-info      checked:bg-info      indeterminate:bg-info      focus-visible:outline-info      text-info-content',
      success:   'border-success   checked:bg-success   indeterminate:bg-success   focus-visible:outline-success   text-success-content',
      warning:   'border-warning   checked:bg-warning   indeterminate:bg-warning   focus-visible:outline-warning   text-warning-content',
      error:     'border-error     checked:bg-error     indeterminate:bg-error     focus-visible:outline-error     text-error-content',
    },
    borderRadius: {
      none: 'rounded-none',
      xs:   'rounded-xs',
      sm:   'rounded-sm',
      md:   'rounded-md',
      lg:   'rounded-lg',
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
