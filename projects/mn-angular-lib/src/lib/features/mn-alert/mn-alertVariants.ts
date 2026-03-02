import { tv, type VariantProps } from 'tailwind-variants';

export const mnAlertVariants = tv({
  base: 'flex items-start gap-3 p-4 border rounded-xl shadow-sm transition-all duration-300',
  variants: {
    kind: {
      success: 'bg-green-50 border-green-200 text-green-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      default: 'bg-white border-gray-200 text-gray-800',
    },
    variant: {
      fill: '',
      outline: 'bg-transparent border-2',
      soft: 'border-none shadow-none',
    }
  },
  compoundVariants: [
    {
      kind: 'success',
      variant: 'fill',
      class: 'bg-green-600 border-green-700 text-white'
    },
    {
      kind: 'info',
      variant: 'fill',
      class: 'bg-blue-600 border-blue-700 text-white'
    },
    {
      kind: 'warning',
      variant: 'fill',
      class: 'bg-amber-500 border-amber-600 text-white'
    },
    {
      kind: 'error',
      variant: 'fill',
      class: 'bg-red-600 border-red-700 text-white'
    }
  ],
  defaultVariants: {
    kind: 'info',
    variant: 'soft'
  }
});

export type MnAlertVariants = VariantProps<typeof mnAlertVariants>;
