import { tv, type VariantProps } from 'tailwind-variants';

export const mnAlertVariants = tv({
  base: 'flex items-start gap-3 p-4 border rounded-xl shadow-sm transition-all duration-300',
  variants: {
    kind: {
      success: 'bg-success/10 border-success/30 text-success',
      info: 'bg-info/10 border-info/30 text-info',
      warning: 'bg-warning/10 border-warning/30 text-warning',
      error: 'bg-error/10 border-error/30 text-error',
      default: 'bg-base-100 border-base-300 text-base-content',
      accent: 'bg-accent/10 border-accent/30 text-accent',
    },
    variant: {
      fill: '',
      outline: 'bg-base-200 border-2',
      soft: 'border-none shadow-none',
    }
  },
  compoundVariants: [
    {
      kind: 'success',
      variant: 'fill',
      class: 'bg-success border-success text-success-content'
    },
    {
      kind: 'info',
      variant: 'fill',
      class: 'bg-info border-info text-info-content'
    },
    {
      kind: 'warning',
      variant: 'fill',
      class: 'bg-warning border-warning text-warning-content'
    },
    {
      kind: 'error',
      variant: 'fill',
      class: 'bg-error border-error text-error-content'
    },
    {
      kind: 'accent',
      variant: 'fill',
      class: 'bg-accent border-accent text-accent-content'
    },
  ],
  defaultVariants: {
    kind: 'info',
    variant: 'soft'
  }
});

export type MnAlertVariants = VariantProps<typeof mnAlertVariants>;
