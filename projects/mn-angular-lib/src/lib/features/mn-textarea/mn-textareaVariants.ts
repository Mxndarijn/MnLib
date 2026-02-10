import { tv, type VariantProps } from 'tailwind-variants';

export const mnTextareaVariants = tv({
  base: 'bg-white border-1 border-gray-500 placeholder-gray-500 text-sm',
  variants: {

    shadow: {
      true: 'shadow-lg',
    },
    size: {
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
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
    resize: {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    }
  },
  defaultVariants: {
    size: 'md',
    borderRadius: 'md',
    resize: 'vertical',
  }
});

export type MnTextareaVariants = VariantProps<typeof mnTextareaVariants>;
