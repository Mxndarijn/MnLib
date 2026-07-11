import {LucideArrowLeft, LucideArrowRight, LucideCheck, LucideIconData, LucideTrash2, LucideX,} from '@lucide/angular';
import {ActionStyle} from './mn-modal.types';

/**
 * Default leading-icon size (px) for modal action buttons, matching the standard
 * (`md`) button. Small (`sm`) buttons use {@link MODAL_ACTION_ICON_SIZE_SM}.
 */
export const MODAL_ACTION_ICON_SIZE = 18;

/** Leading-icon size (px) for `sm`-sized modal action buttons. */
export const MODAL_ACTION_ICON_SIZE_SM = 16;

/**
 * The canonical Lucide icon data used as defaults across all modal action buttons.
 * Each value is a Lucide icon's static `.icon` data, rendered via the dynamic
 * `svg[lucideIcon]` directive so no icon has to be registered in `MN_ICON_MAP`.
 */
export const MN_MODAL_ACTION_ICONS = {
  /** Affirmative action (confirm / submit / complete). */
  confirm: LucideCheck.icon as LucideIconData,
  /** Destructive action (danger style). */
  danger: LucideTrash2.icon as LucideIconData,
  /** Cancel / dismiss / close action. */
  cancel: LucideX.icon as LucideIconData,
  /** Wizard forward navigation (rendered trailing). */
  next: LucideArrowRight.icon as LucideIconData,
  /** Wizard backward navigation. */
  back: LucideArrowLeft.icon as LucideIconData,
} as const;

/**
 * Resolves the default action-button icon from its {@link ActionStyle}. Used by
 * generic footer actions and any confirm button that has no explicit icon:
 * `DANGER` → trash, `PRIMARY` → check, everything else (`GHOST`/`SECONDARY`) → cross.
 * @param style The action's style, if any.
 * @returns The Lucide icon data to render.
 */
export function defaultIconForStyle(style?: ActionStyle): LucideIconData {
  switch (style) {
    case ActionStyle.DANGER:
      return MN_MODAL_ACTION_ICONS.danger;
    case ActionStyle.PRIMARY:
      return MN_MODAL_ACTION_ICONS.confirm;
    default:
      return MN_MODAL_ACTION_ICONS.cancel;
  }
}
