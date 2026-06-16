import {tv, type VariantProps} from 'tailwind-variants';

export const mnSkeletonVariants = tv({
  base: 'bg-base-300 relative overflow-hidden',
  variants: {
    shape: {
      rectangle: 'rounded-md',
      circle: 'rounded-full',
      text: 'rounded h-4',
    },
  },
  defaultVariants: {
    shape: 'rectangle',
  },
});

export type MnSkeletonVariantProps = VariantProps<typeof mnSkeletonVariants>;
