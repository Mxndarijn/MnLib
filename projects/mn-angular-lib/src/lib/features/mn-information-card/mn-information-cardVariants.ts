import { tv, type VariantProps } from 'tailwind-variants';

export const mnInformationCardVariants = tv({
  base: '',
  variants: {
    bottomBorder: {
      true: 'border-b border-b-2 border-brand-500',
    },
    shadow: {
      true: 'shadow-lg',
    },
    textPosition: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
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
  },
});

export type MnInformationCardVariants = VariantProps<typeof mnInformationCardVariants>;
