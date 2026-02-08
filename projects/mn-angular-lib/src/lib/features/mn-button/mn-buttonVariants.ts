import { tv, type VariantProps } from 'tailwind-variants';

export const mnButtonVariants = tv({
  base: 'hover:cursor-pointer',
  variants: {
    size: {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-1.5 text-base',
      lg: 'px-4 py-2 text-lg',
    },

    variant: {
      fill: '',
      outline: 'bg-transparent border',
      text: 'bg-transparent',
    },

    // Intentionally empty; resolved via compoundVariants
    color: {
      primary: '',
      secondary: '',
      danger: '',
      warning: '',
      success: '',
    },

    borderRadius: {
      none: 'rounded-none',
      xs: 'rounded-xs',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      two_xl: 'rounded-2xl',
      three_xl: 'rounded-3xl',
      four_xl: 'rounded-4xl',
    },
    disabled: {
      true: 'opacity-50 pointer-events-none',
    }
  },

  compoundVariants: [
    // Fill
    { variant: 'fill', color: 'primary',   class: 'bg-brand-600 text-white hover:bg-brand-700' },
    { variant: 'fill', color: 'secondary', class: 'bg-gray-600 text-white hover:bg-gray-700' },
    { variant: 'fill', color: 'danger',    class: 'bg-red-600 text-white hover:bg-red-700' },
    { variant: 'fill', color: 'warning',   class: 'bg-amber-500 text-black hover:bg-amber-600' },
    { variant: 'fill', color: 'success',   class: 'bg-green-600 text-white hover:bg-green-700' },

    // Outline
    { variant: 'outline', color: 'primary',   class: 'border-brand-600 text-blue-600 hover:bg-brand-100' },
    { variant: 'outline', color: 'secondary', class: 'border-gray-600 text-gray-700 hover:bg-gray-100' },
    { variant: 'outline', color: 'danger',    class: 'border-red-600 text-red-600 hover:bg-red-100' },
    { variant: 'outline', color: 'warning',   class: 'border-amber-500 text-amber-600 hover:bg-amber-100' },
    { variant: 'outline', color: 'success',   class: 'border-green-600 text-green-600 hover:bg-green-100' },

    // Text
    { variant: 'text', color: 'primary',   class: 'text-brand-600 hover:bg-brand-100' },
    { variant: 'text', color: 'secondary', class: 'text-gray-700 hover:bg-gray-100' },
    { variant: 'text', color: 'danger',    class: 'text-red-600 hover:bg-red-100' },
    { variant: 'text', color: 'warning',   class: 'text-amber-600 hover:bg-amber-100' },
    { variant: 'text', color: 'success',   class: 'text-green-600 hover:bg-green-100' },
  ],

  defaultVariants: {
    size: 'md',
    variant: 'fill',
    color: 'primary',
    borderRadius: 'xl',
    disabled: false,
  },
});

export type MnButtonVariants = VariantProps<typeof mnButtonVariants>;
