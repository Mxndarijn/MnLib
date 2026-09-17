import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Layout variants for the trigger button. An icon-only trigger (the default ⋯) is a
 * square affordance; a trigger with a text label grows to fit its content with
 * horizontal padding instead. The `labeled` axis switches between the two.
 */
export const mnDropdownTriggerVariants = tv({
  base: 'inline-flex items-center justify-center gap-x-1.5 text-base-content/80 cursor-pointer',
  variants: {
    size: {
      sm: '',
      md: '',
      lg: '',
    },
    labeled: {
      true: '',
      false: '',
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
  compoundVariants: [
    // Icon-only: a fixed square box.
    { labeled: false, size: 'sm', class: 'h-7 w-7' },
    { labeled: false, size: 'md', class: 'h-9 w-9' },
    { labeled: false, size: 'lg', class: 'h-11 w-11' },
    // Labeled: content width with padding.
    { labeled: true, size: 'sm', class: 'px-2.5 py-1 text-sm' },
    { labeled: true, size: 'md', class: 'px-3 py-1.5 text-sm' },
    { labeled: true, size: 'lg', class: 'px-4 py-2 text-base' },
  ],
  defaultVariants: {
    size: 'md',
    labeled: false,
    borderRadius: 'md',
  },
});

export type MnDropdownTriggerVariants = VariantProps<typeof mnDropdownTriggerVariants>;
