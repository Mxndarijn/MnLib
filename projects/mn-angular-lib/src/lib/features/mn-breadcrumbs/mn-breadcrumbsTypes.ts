/**
 * A single crumb in the breadcrumb trail.
 *
 * A crumb becomes a link when it carries an {@link href}; otherwise it renders
 * as a button that only emits {@link MnBreadcrumbs.crumbClick} / runs
 * {@link onClick}. The library stays router-agnostic — an app wires SPA
 * navigation through `onClick`/`crumbClick`, or lets the `href` anchor navigate.
 */
export type MnBreadcrumbItem = {
  /** Translation key or literal label for the crumb. */
  label: string;
  /** Optional link target; when set the crumb renders as an `<a href>`. */
  href?: string;
  /** Optional callback invoked on click (fires alongside `crumbClick`). */
  onClick?: () => void;
};

/**
 * Data source for {@link MnBreadcrumbs}.
 *
 * When {@link items} holds crumbs the component renders a linkable trail whose
 * **last** item is the current page (never a link). When `items` is empty the
 * component degrades to a single "Back" control: it navigates to
 * {@link backHref} when given, otherwise steps back through browser history.
 */
export type MnBreadcrumbsData = {
  /** Ordered crumbs root → current. Empty ⇒ the "Back" fallback renders instead. */
  items: MnBreadcrumbItem[];
  /** Fallback "Back" target. Set ⇒ renders `<a href>`; unset ⇒ `history.back()`. */
  backHref?: string;
  /** Translation key or literal for the "Back" label. Defaults to `'back'`. */
  backLabel?: string;
  /** Visual scale. Defaults to `'md'`. */
  size?: 'sm' | 'md';
};
