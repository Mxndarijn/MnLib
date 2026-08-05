import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Layout variants for the ⋯ trigger button. Kept deliberately small: the trigger is
 * an icon affordance, so it only exposes the knobs a consumer realistically retunes
 * (size and border radius). Colour/hover come from the underlying mn-button.
 */
export const mnDropdownTriggerVariants = tv({
  base: 'inline-flex items-center justify-center text-base-content/70 cursor-pointer',
  variants: {
    size: {
      sm: 'h-7 w-7',
      md: 'h-9 w-9',
      lg: 'h-11 w-11',
    },
    borderRadius: {
      none: 'rounded-none',
      xs: 'rounded-xs',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    },
  },
  defaultVariants: {
    size: 'md',
    borderRadius: 'md',
  },
});

export type MnDropdownTriggerVariants = VariantProps<typeof mnDropdownTriggerVariants>;
