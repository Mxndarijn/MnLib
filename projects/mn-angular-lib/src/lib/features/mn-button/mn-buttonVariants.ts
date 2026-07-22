import {tv, type VariantProps} from 'tailwind-variants';

export const mnButtonVariants = tv({
  base: 'inline-flex items-center justify-center hover:cursor-pointer transition-all duration-300 ease-in-out',
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
      // Transparent button that only reveals a subtle surface on hover — the idiomatic
      // icon-button look. Colors resolved via compoundVariants.
      ghost: 'bg-transparent',
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
    // Icon-button shape. `circle`/`square` drop the text padding and make the button a
    // fixed square sized off `size` (see compoundVariants), overriding `borderRadius`.
    // `default` leaves a normal text button untouched.
    shape: {
      default: '',
      circle: 'p-0 shrink-0 rounded-full',
      square: 'p-0 shrink-0 rounded-md',
    },
    disabled: {
      true: 'opacity-50 pointer-events-none',
    },
    // Busy state: dim and block interaction like `disabled`, and hint the wait cursor.
    // The spinner itself is rendered in the template (see mn-button.html).
    loading: {
      true: 'opacity-50 pointer-events-none cursor-wait',
    },
    wrap: {
      true: 'whitespace-normal',
      false: 'whitespace-nowrap',
    },
    hover: {
      true: '',
    },
  },

  compoundVariants: [
    // Fill — base
    { variant: 'fill', color: 'primary',   class: 'bg-primary text-primary-content border border-primary' },
    { variant: 'fill', color: 'secondary', class: 'bg-neutral text-neutral-content border border-neutral' },
    { variant: 'fill', color: 'danger',    class: 'bg-error text-error-content border border-error' },
    { variant: 'fill', color: 'warning',   class: 'bg-warning text-warning-content border border-warning' },
    { variant: 'fill', color: 'success',   class: 'bg-success text-success-content border border-success' },
    { variant: 'fill', color: 'accent',    class: 'bg-accent text-accent-content border border-accent' },
    { variant: 'fill', color: 'gray',      class: 'bg-base-content/10 text-base-content/70 border border-base-content/10' },
    // Fill — hover
    { variant: 'fill', color: 'primary',   hover: true, class: 'hover:brightness-60' },
    { variant: 'fill', color: 'secondary', hover: true, class: 'hover:brightness-60' },
    { variant: 'fill', color: 'danger',    hover: true, class: 'hover:brightness-60' },
    { variant: 'fill', color: 'warning',   hover: true, class: 'hover:brightness-60' },
    { variant: 'fill', color: 'success',   hover: true, class: 'hover:brightness-60' },
    { variant: 'fill', color: 'accent',    hover: true, class: 'hover:brightness-60' },
    { variant: 'fill', color: 'gray',      hover: true, class: 'hover:bg-base-content/20' },
    // Outline — base
    { variant: 'outline', color: 'primary',   class: 'border-primary text-primary' },
    { variant: 'outline', color: 'secondary', class: 'border-neutral text-neutral' },
    { variant: 'outline', color: 'danger',    class: 'border-error text-error' },
    { variant: 'outline', color: 'warning',   class: 'border-warning text-warning' },
    { variant: 'outline', color: 'success',   class: 'border-success text-success' },
    { variant: 'outline', color: 'accent',    class: 'border-accent text-accent' },
    { variant: 'outline', color: 'gray',      class: 'border-base-content/70 text-base-content/70' },
    // Outline — hover
    { variant: 'outline', color: 'primary',   hover: true, class: 'hover:bg-primary/10' },
    { variant: 'outline', color: 'secondary', hover: true, class: 'hover:bg-neutral/10' },
    { variant: 'outline', color: 'danger',    hover: true, class: 'hover:bg-error/10' },
    { variant: 'outline', color: 'warning',   hover: true, class: 'hover:bg-warning/10' },
    { variant: 'outline', color: 'success',   hover: true, class: 'hover:bg-success/10' },
    { variant: 'outline', color: 'accent',    hover: true, class: 'hover:bg-accent/10' },
    { variant: 'outline', color: 'gray',      hover: true, class: 'hover:bg-base-content/10' },
    // Text — base
    { variant: 'text', color: 'primary',   class: 'text-primary' },
    { variant: 'text', color: 'secondary', class: 'text-neutral' },
    { variant: 'text', color: 'danger',    class: 'text-error' },
    { variant: 'text', color: 'warning',   class: 'text-warning' },
    { variant: 'text', color: 'success',   class: 'text-success' },
    { variant: 'text', color: 'accent',    class: 'text-accent' },
    { variant: 'text', color: 'gray',      class: 'text-base-content/70' },
    // Text — hover
    { variant: 'text', color: 'primary',   hover: true, class: 'hover:bg-primary/10' },
    { variant: 'text', color: 'secondary', hover: true, class: 'hover:bg-neutral/10' },
    { variant: 'text', color: 'danger',    hover: true, class: 'hover:bg-error/10' },
    { variant: 'text', color: 'warning',   hover: true, class: 'hover:bg-warning/10' },
    { variant: 'text', color: 'success',   hover: true, class: 'hover:bg-success/10' },
    { variant: 'text', color: 'accent',    hover: true, class: 'hover:bg-accent/10' },
    { variant: 'text', color: 'gray',      hover: true, class: 'hover:bg-base-content/10' },
    // Text Underline — base
    { variant: 'textUnderline', color: 'primary',   class: 'text-primary underline underline-offset-2' },
    { variant: 'textUnderline', color: 'secondary', class: 'text-neutral underline underline-offset-2' },
    { variant: 'textUnderline', color: 'danger',    class: 'text-error underline underline-offset-2' },
    { variant: 'textUnderline', color: 'warning',   class: 'text-warning underline underline-offset-2' },
    { variant: 'textUnderline', color: 'success',   class: 'text-success underline underline-offset-2' },
    { variant: 'textUnderline', color: 'accent',    class: 'text-accent underline underline-offset-2' },
    { variant: 'textUnderline', color: 'gray',      class: 'text-base-content/70 underline underline-offset-2' },
    // Text Underline — hover
    { variant: 'textUnderline', color: 'primary',   hover: true, class: 'hover:bg-primary/10' },
    { variant: 'textUnderline', color: 'secondary', hover: true, class: 'hover:bg-neutral/10' },
    { variant: 'textUnderline', color: 'danger',    hover: true, class: 'hover:bg-error/10' },
    { variant: 'textUnderline', color: 'warning',   hover: true, class: 'hover:bg-warning/10' },
    { variant: 'textUnderline', color: 'success',   hover: true, class: 'hover:bg-success/10' },
    { variant: 'textUnderline', color: 'accent',    hover: true, class: 'hover:bg-accent/10' },
    { variant: 'textUnderline', color: 'gray',      hover: true, class: 'hover:bg-base-content/10' },
    // Ghost — base (transparent, colored text/icon)
    {variant: 'ghost', color: 'primary', class: 'text-primary'},
    {variant: 'ghost', color: 'secondary', class: 'text-neutral'},
    {variant: 'ghost', color: 'danger', class: 'text-error'},
    {variant: 'ghost', color: 'warning', class: 'text-warning'},
    {variant: 'ghost', color: 'success', class: 'text-success'},
    {variant: 'ghost', color: 'accent', class: 'text-accent'},
    {variant: 'ghost', color: 'gray', class: 'text-base-content'},
    // Ghost — hover (reveal a subtle surface in the button's own hue)
    {variant: 'ghost', color: 'primary', hover: true, class: 'hover:bg-primary/10'},
    {variant: 'ghost', color: 'secondary', hover: true, class: 'hover:bg-neutral/10'},
    {variant: 'ghost', color: 'danger', hover: true, class: 'hover:bg-error/10'},
    {variant: 'ghost', color: 'warning', hover: true, class: 'hover:bg-warning/10'},
    {variant: 'ghost', color: 'success', hover: true, class: 'hover:bg-success/10'},
    {variant: 'ghost', color: 'accent', hover: true, class: 'hover:bg-accent/10'},
    {variant: 'ghost', color: 'gray', hover: true, class: 'hover:bg-base-content/10'},
    // Icon-button square sizing — applies to both circle and square shapes, sized off `size`.
    {shape: 'circle', size: 'sm', class: 'h-8 w-8'},
    {shape: 'circle', size: 'md', class: 'h-10 w-10'},
    {shape: 'circle', size: 'lg', class: 'h-12 w-12'},
    {shape: 'square', size: 'sm', class: 'h-8 w-8'},
    {shape: 'square', size: 'md', class: 'h-10 w-10'},
    {shape: 'square', size: 'lg', class: 'h-12 w-12'},
  ],

  defaultVariants: {
    size: 'md',
    variant: 'fill',
    color: 'primary',
    borderRadius: 'lg',
    shape: 'default',
    disabled: false,
    loading: false,
    wrap: false,
    hover: true,
  },
});

export type MnButtonVariants = VariantProps<typeof mnButtonVariants>;
