import { tv, type VariantProps } from 'tailwind-variants';

export const mnButtonVariants = tv({
  base: 'hover:cursor-pointer transition-all duration-300 ease-in-out',
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
      textUnderline: 'bg-transparent underline underline-offset-2',
    },

    // Intentionally empty; resolved via compoundVariants
    color: {
      primary: '',
      secondary: '',
      danger: '',
      warning: '',
      success: '',
      accent: '',
      gray: '',
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
    },
    wrap: {
      true: 'whitespace-normal',
      false: 'whitespace-nowrap',
    }
  },

  compoundVariants: [
    // Fill
    { variant: 'fill', color: 'primary',   class: 'bg-primary text-primary-content hover:brightness-60' },
    { variant: 'fill', color: 'secondary', class: 'bg-neutral text-neutral-content hover:brightness-60' },
    { variant: 'fill', color: 'danger',    class: 'bg-error text-error-content hover:brightness-60' },
    { variant: 'fill', color: 'warning',   class: 'bg-warning text-warning-content hover:brightness-60' },
    { variant: 'fill', color: 'success',   class: 'bg-success text-success-content hover:brightness-60' },
    { variant: 'fill', color: 'accent',    class: 'bg-accent text-accent-content hover:brightness-60' },
    { variant: 'fill', color: 'gray',     class: 'bg-base-content/10 text-base-content/70 hover:bg-base-content/20' },
    // Outline
    { variant: 'outline', color: 'primary',   class: 'border-primary text-primary hover:bg-primary/10' },
    { variant: 'outline', color: 'secondary', class: 'border-neutral text-neutral hover:bg-neutral/10' },
    { variant: 'outline', color: 'danger',    class: 'border-error text-error hover:bg-error/10' },
    { variant: 'outline', color: 'warning',   class: 'border-warning text-warning hover:bg-warning/10' },
    { variant: 'outline', color: 'success',   class: 'border-success text-success hover:bg-success/10' },
    { variant: 'outline', color: 'accent',    class: 'border-accent text-accent hover:bg-accent/10' },
    { variant: 'outline', color: 'gray',     class: 'border-base-content/70 text-base-content/70 hover:bg-base-content/10' },
    // Text
    { variant: 'text', color: 'primary',   class: 'text-primary hover:bg-primary/10' },
    { variant: 'text', color: 'secondary', class: 'text-neutral hover:bg-neutral/10' },
    { variant: 'text', color: 'danger',    class: 'text-error hover:bg-error/10' },
    { variant: 'text', color: 'warning',   class: 'text-warning hover:bg-warning/10' },
    { variant: 'text', color: 'success',   class: 'text-success hover:bg-success/10' },
    { variant: 'text', color: 'accent',    class: 'text-accent hover:bg-accent/10' },
    { variant: 'text', color: 'gray',     class: 'text-base-content/70 hover:bg-base-content/10' },
    // Text Underline
    { variant: 'textUnderline', color: 'primary',   class: 'text-primary underline underline-offset-2 hover:bg-primary/10' },
    { variant: 'textUnderline', color: 'secondary', class: 'text-neutral underline underline-offset-2 hover:bg-neutral/10' },
    { variant: 'textUnderline', color: 'danger',    class: 'text-error underline underline-offset-2 hover:bg-error/10' },
    { variant: 'textUnderline', color: 'warning',   class: 'text-warning underline underline-offset-2 hover:bg-warning/10' },
    { variant: 'textUnderline', color: 'success',   class: 'text-success underline underline-offset-2 hover:bg-success/10' },
    { variant: 'textUnderline', color: 'accent',    class: 'text-accent underline underline-offset-2 hover:bg-accent/10' },
    { variant: 'textUnderline', color: 'gray',     class: 'text-base-content/70 underline underline-offset-2 hover:bg-base-content/10' },
  ],

  defaultVariants: {
    size: 'md',
    variant: 'fill',
    color: 'primary',
    borderRadius: 'lg',
    disabled: false,
    wrap: false,
  },
});

export type MnButtonVariants = VariantProps<typeof mnButtonVariants>;
