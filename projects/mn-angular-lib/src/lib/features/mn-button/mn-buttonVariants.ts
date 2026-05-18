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
    { variant: 'fill', color: 'primary',   class: 'bg-primary text-primary-content hover:bg-primary/80' },
    { variant: 'fill', color: 'secondary', class: 'bg-neutral text-neutral-content hover:bg-neutral/80' },
    { variant: 'fill', color: 'danger',    class: 'bg-error text-error-content hover:bg-error/80' },
    { variant: 'fill', color: 'warning',   class: 'bg-warning text-warning-content hover:bg-warning/80' },
    { variant: 'fill', color: 'success',   class: 'bg-success text-success-content hover:bg-success/80' },

    // Outline
    { variant: 'outline', color: 'primary',   class: 'border-primary text-primary hover:bg-primary/10' },
    { variant: 'outline', color: 'secondary', class: 'border-neutral text-neutral hover:bg-neutral/10' },
    { variant: 'outline', color: 'danger',    class: 'border-error text-error hover:bg-error/10' },
    { variant: 'outline', color: 'warning',   class: 'border-warning text-warning hover:bg-warning/10' },
    { variant: 'outline', color: 'success',   class: 'border-success text-success hover:bg-success/10' },

    // Text
    { variant: 'text', color: 'primary',   class: 'text-primary hover:bg-primary/10' },
    { variant: 'text', color: 'secondary', class: 'text-neutral hover:bg-neutral/10' },
    { variant: 'text', color: 'danger',    class: 'text-error hover:bg-error/10' },
    { variant: 'text', color: 'warning',   class: 'text-warning hover:bg-warning/10' },
    { variant: 'text', color: 'success',   class: 'text-success hover:bg-success/10' },
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
