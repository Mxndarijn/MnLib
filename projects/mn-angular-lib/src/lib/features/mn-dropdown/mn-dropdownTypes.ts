import { TemplateRef } from '@angular/core';
import { MnDropdownTriggerVariants } from './mn-dropdownVariants';

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
   * Optional leading icon, supplied as a template so the consumer keeps full control
   * over which icon set is used (a lucide `<svg>`, an `<mn-icon>`, an emoji…).
   */
  icon?: TemplateRef<unknown>;

  /** Invoked when the item is chosen. The menu closes immediately afterwards. */
  run: () => void;

  /** When true the item is shown dimmed and cannot be chosen. */
  disabled?: boolean;

  /** Renders the item in a destructive style (e.g. a "Delete" action). */
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

  /** Accessible label for the ⋯ trigger button. Falls back to a translated default. */
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
