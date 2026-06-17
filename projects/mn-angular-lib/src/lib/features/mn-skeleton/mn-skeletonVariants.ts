import {tv, type VariantProps} from 'tailwind-variants';

export const mnSkeletonVariants = tv({
  base: 'bg-base-300 relative overflow-hidden',
  variants: {
    shape: {
      // Each shape carries a sensible default size so a bare <mn-skeleton> stays
      // visible. The width/height inputs are applied as inline styles, which win
      // over these utility classes whenever the consumer supplies dimensions.
      rectangle: 'rounded-md h-4',
      circle: 'rounded-full h-10 w-10',
      text: 'rounded h-4',
    },
  },
  defaultVariants: {
    shape: 'rectangle',
  },
});

export type MnSkeletonVariantProps = VariantProps<typeof mnSkeletonVariants>;
