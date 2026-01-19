import {tv, VariantProps} from 'tailwind-variants';

export const mnButtonVariants = tv({
  base: 'p-8',
  variants: {
    size: {
      sm: 'px-2 py-8 text-sm',
      md: 'px-3 py-1.5 text-base',
      lg: 'px-4 py-2 text-lg',
    },
    variant: {
      fill: '',
      outline: 'bg-transparent border',
      text: 'bg-transparent',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'fill',

  },
});

export type MnButtonVariants = VariantProps<typeof  mnButtonVariants>
