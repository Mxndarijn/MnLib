import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Styling for {@link MnBreadcrumbs}, expressed as tailwind-variants slots so the
 * template can pull one class string per role. Theme tokens only, so the trail
 * reads correctly in both light and dark. Links and the Back control are native
 * `<button>`/`<a>` elements reset to look like plain text with a hover accent.
 *
 * A crumb carries vertical padding that the list takes back with a negative
 * margin, so the row keeps the height it always had while each crumb is a
 * target you can hit rather than the bare height of its text. The collapsed
 * control replaces the trail on a phone, where it is the only way up, so it
 * takes a full 44px.
 */
export const mnBreadcrumbsVariants = tv({
  slots: {
    root: 'flex items-center',
    list: 'flex flex-wrap items-center -my-1.5',
    link:
      'inline-flex items-center bg-transparent border-0 px-1 -mx-1 py-1.5 rounded-md cursor-pointer ' +
      'text-base-content/60 hover:text-primary transition-colors ' +
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    current: 'inline-flex items-center py-1.5 font-semibold text-base-content',
    separator: 'inline-flex shrink-0 text-base-content/40',
    back:
      'inline-flex items-center gap-1 bg-transparent border-0 p-0 rounded-md cursor-pointer ' +
      'text-base-content/70 hover:text-primary transition-colors ' +
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    collapsed:
      'inline-flex min-h-11 items-center gap-1 bg-transparent border-0 px-1 -mx-1 rounded-md cursor-pointer ' +
      'text-base-content/70 hover:text-primary transition-colors sm:hidden ' +
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  },
  variants: {
    size: {
      // Text size lives on the root so every crumb, separator and the Back
      // control inherit it; only the inter-crumb gap changes per slot.
      sm: { root: 'text-xs', list: 'gap-1' },
      md: { root: 'text-sm', list: 'gap-1.5' },
    },
    /** Whether the parent crumb takes the trail's place below `sm`. */
    collapsible: {
      true: { list: 'hidden sm:flex' },
      false: {},
    },
  },
  defaultVariants: {
    size: 'md',
    collapsible: false,
  },
});

export type MnBreadcrumbsVariants = VariantProps<typeof mnBreadcrumbsVariants>;
