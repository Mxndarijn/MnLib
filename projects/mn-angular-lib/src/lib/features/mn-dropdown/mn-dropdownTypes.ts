import { TemplateRef } from '@angular/core';
import { LucideIconData } from '@lucide/angular';
import { MnButtonTypes } from '../mn-button';
import { MnDropdownTriggerVariants } from './mn-dropdownVariants';

/**
 * The leading icon of a command — either a `TemplateRef` (full control over the icon
 * set: an `<mn-icon>`, an emoji, a bespoke `<svg>`) or lucide icon *data*, i.e. a
 * lucide icon's static `.icon` (e.g. `LucidePencil.icon`), which the component renders
 * itself at the right size for its slot.
 *
 * The data form exists so an action can be declared in plain TypeScript — a shared
 * action factory, a config array, a service — without the host component having to
 * carry an `<ng-template>` stub and a `@ViewChild` for every glyph. Same convention as
 * {@link MnCollectionDataSource.emptyIcon}.
 */
export type MnActionIcon = TemplateRef<unknown> | LucideIconData;

/** Theme colour tokens an action item can be tinted with, mirroring mn-button's palette. */
export type MnDropdownActionColor =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'warning'
  | 'success'
  | 'accent'
  | 'gray';

/**
 * A single command in a {@link MnDropdownProps} menu. Unlike a select option it holds
 * no value — choosing it fires {@link run} and closes the menu. This is a *command*
 * menu, not a value picker, which is why mn-dropdown is not a ControlValueAccessor.
 */
export type MnDropdownAction = {
  /** Visible label. Falls back to `labelKey`'s resolved text when omitted. */
  label?: string;

  /**
   * Translation key for the label, resolved via MnLanguageService and kept updated on
   * locale change. Takes precedence over {@link label} when it resolves to a value.
   */
  labelKey?: string;

  /**
   * Optional leading icon: a template, so the consumer keeps full control over which
   * icon set is used (an `<mn-icon>`, an emoji…), or lucide icon data such as
   * `LucidePencil.icon` for a template-free declaration. See {@link MnActionIcon}.
   */
  icon?: MnActionIcon;

  /** Invoked when the item is chosen. The menu closes immediately afterwards. */
  run: () => void;

  /** When true the item is shown dimmed and cannot be chosen. */
  disabled?: boolean;

  /**
   * Tints the item's label and icon. When omitted the item uses the default foreground
   * ({@link danger} still forces the destructive red). Lets a host carry a per-item
   * colour — e.g. an mn-table actions column keeps the same colours it shows inline.
   */
  color?: MnDropdownActionColor;

  /** Renders the item in a destructive style (e.g. a "Delete" action). Shorthand for
   *  the red foreground; equivalent to `color: 'danger'`. */
  danger?: boolean;

  /**
   * Extra text the search filter matches against, beyond the visible label — a summary,
   * synonyms, a category. Only consulted when the menu is {@link MnDropdownProps.searchable}.
   * Lets search find a command by more than its label, e.g. a help search that matches a
   * topic's title *and* its summary.
   */
  keywords?: string;
};

/**
 * A divider between commands, rendered as an `<hr>`. Group related actions — e.g. a
 * destructive "Logout" set off from a profile menu's navigation, or a name header above
 * its items. Non-interactive: it is skipped by keyboard nav and hidden while a
 * {@link MnDropdownProps.searchable} filter is active (a divider stranded between hidden
 * results is meaningless).
 */
export type MnDropdownSeparator = {
  separator: true;
};

/** An entry in a {@link MnDropdownProps.actions} list: a command or a {@link MnDropdownSeparator}. */
export type MnDropdownItem = MnDropdownAction | MnDropdownSeparator;

/**
 * Configuration for {@link MnDropdown}, passed through its single `datasource` input.
 * (The type keeps the `Props` name; only the input binding is `datasource`.)
 */
export type MnDropdownProps = {
  /**
   * Unique identifier for the trigger/menu accessibility wiring. Optional — a stable one is
   * generated when omitted, so the leanest dropdown is just `{ actions: [...] }`. Set it
   * explicitly only to target this instance from {@link MnConfigService} `#id` overrides.
   */
  id?: string;

  /** The commands rendered in the menu, in order. May include {@link MnDropdownSeparator}
   *  entries (`{ separator: true }`) to divide the list into groups. */
  actions: MnDropdownItem[];

  /**
   * Text shown inside the trigger button, turning the ⋯ icon into a labelled control
   * (e.g. "Actions"). When set, {@link triggerIcon} defaults to a trailing chevron
   * instead of the dots. Omit for the icon-only ⋯ trigger.
   */
  triggerLabel?: string;

  /** Translation key for {@link triggerLabel}. Resolved via MnLanguageService. */
  triggerLabelKey?: string;

  /**
   * Which glyph the trigger shows. Defaults to `'dots-vertical'` (⋮) for an icon-only
   * trigger, or `'chevron'` (▾) when a {@link triggerLabel} is set. Use `'none'` for a
   * text-only trigger.
   *
   * Beyond the three built-in glyphs, this also accepts a custom {@link MnActionIcon} — a
   * `TemplateRef` (full control: an `<mn-icon>`, an emoji, a bespoke `<svg>`) or lucide
   * icon *data* such as `LucideFilter.icon`, rendered by the component at trigger size.
   * The same convention the per-item {@link MnDropdownAction.icon} uses. (For a horizontal
   * ellipsis ⋯, pass `LucideEllipsis.icon` here.)
   */
  triggerIcon?: 'dots-vertical' | 'chevron' | 'none' | MnActionIcon;

  /**
   * Styles the trigger as a full {@link MnButtonTypes} button instead of the default ghost
   * ⋯ affordance — `variant`, `color`, `size`, `borderRadius`, `shape`, etc. Merged over
   * the default `{ size: 'sm', variant: 'text', color: 'gray' }`, so a partial config only
   * changes what you name (e.g. `{ variant: 'fill', color: 'primary' }` for a solid button).
   *
   * When set, mn-button owns the trigger's look entirely: the trigger's own {@link size}
   * and {@link borderRadius} props no longer apply (use this config's), and mn-button's
   * `borderRadius` default (`lg`) takes over. Composes with {@link triggerIcon} and
   * {@link triggerLabel} — the glyph/label render inside the styled button. For a square
   * icon-only button, set `shape: 'square'` (or `'circle'`) here; otherwise a filled
   * icon-only trigger is a small padded box rather than a fixed square.
   */
  triggerButton?: Partial<MnButtonTypes>;

  /** Accessible label for the trigger button. Falls back to a translated default.
   *  Ignored for name purposes when {@link triggerLabel} provides visible text. */
  ariaLabel?: string;

  /** Translation key for {@link ariaLabel}. Resolved via MnLanguageService. */
  ariaLabelKey?: string;

  /**
   * Heading shown above the items — on mobile the sheet covers its own trigger, so a
   * title tells the user what the menu belongs to. Optional on desktop.
   */
  menuLabel?: string;

  /** Translation key for {@link menuLabel}. Resolved via MnLanguageService. */
  menuLabelKey?: string;

  /**
   * Whether the menu renders as a bottom sheet on small screens (< 640px). Defaults
   * to true; set false to keep the trigger-anchored popover on mobile too.
   */
  mobileSheet?: boolean;

  /**
   * Shows a filter input at the top of the menu (and the mobile sheet), narrowing the
   * actions as the user types. Each action matches on its resolved label and its
   * {@link MnDropdownAction.keywords}, case-insensitively. On desktop the input is
   * focused on open; pressing Enter runs the first still-visible, enabled action —
   * mirroring a help search that opens the top hit. Defaults to false.
   */
  searchable?: boolean;

  /** Placeholder for the search input. Falls back to a translated default ("Search..."). */
  searchPlaceholder?: string;

  /** Translation key for {@link searchPlaceholder}. Resolved via MnLanguageService. */
  searchPlaceholderKey?: string;

  /** Text shown in place of the list when the filter matches no actions. Falls back to
   *  a translated default ("No results"). */
  searchEmptyLabel?: string;

  /** Translation key for {@link searchEmptyLabel}. Resolved via MnLanguageService. */
  searchEmptyLabelKey?: string;

  /** Size variant of the ⋯ trigger (default: 'md'). */
  size?: MnDropdownTriggerVariants['size'];

  /** Border-radius variant of the ⋯ trigger (default: 'md'). */
  borderRadius?: MnDropdownTriggerVariants['borderRadius'];
};

/**
 * Config resolved via {@link MnConfigService} under the `mn-dropdown` section, so an
 * app can set shared accessible labels once instead of per instance.
 */
export type MnDropdownUIConfig = {
  /** Default accessible label for the ⋯ trigger (falls back to "Actions"). */
  ariaLabel?: string;
  /** Default heading for the menu/sheet. */
  menuLabel?: string;
  /** Accessible label for the mobile sheet's close button (falls back to "Close"). */
  closeLabel?: string;
  /** Default placeholder for the search input (falls back to "Search..."). */
  searchPlaceholder?: string;
  /** Default empty-state text when the filter matches nothing (falls back to "No results"). */
  searchEmptyLabel?: string;
};
