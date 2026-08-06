import { TemplateRef } from '@angular/core';
import { LucideIconData } from '@lucide/angular';
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
};

/**
 * Configuration for {@link MnDropdown}. Everything is passed through the single
 * `props` input, mirroring mn-select / mn-multi-select.
 */
export type MnDropdownProps = {
  /** Unique identifier, required for the trigger/menu accessibility wiring. */
  id: string;

  /** The commands rendered in the menu, in order. */
  actions: MnDropdownAction[];

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
   * text-only trigger, or `'dots-horizontal'` (⋯) for the horizontal ellipsis.
   */
  triggerIcon?: 'dots-vertical' | 'dots-horizontal' | 'chevron' | 'none';

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
};
