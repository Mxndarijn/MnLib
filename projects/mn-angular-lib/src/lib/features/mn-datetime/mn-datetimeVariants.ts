import { tv, type VariantProps } from 'tailwind-variants';

export const mnDatetimeVariants = tv({
  base: 'bg-base-100 border-1 border-base-300 placeholder-base-content/50 text-base-content text-sm',
  variants: {
    shadow: {
      true: 'shadow-lg',
    },
    size: {
      sm: 'px-2 py-1.5',
      md: 'px-3 py-2',
      lg: 'px-4 py-3',
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
    fullWidth: {
      true: 'w-full',
    },
    hover: {
      true: 'hover:cursor-pointer hover:bg-base-200 transition-colors duration-300 ease-in-out',
    },
  },
  defaultVariants: {
    size: 'md',
    borderRadius: 'md',
    hover: true,
  },
});

export type MnDatetimeVariants = VariantProps<typeof mnDatetimeVariants>;
