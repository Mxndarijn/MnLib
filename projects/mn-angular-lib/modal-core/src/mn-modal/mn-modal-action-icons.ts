import { LucideIconData } from '@lucide/angular';
import {ActionStyle} from './mn-modal.types';
import * as lucide from 'lucide';
import { lucideIcons } from 'mn-angular-lib/core';

/** Lucide icons this file renders. */
const ICONS = lucideIcons({
  ArrowLeft: lucide.ArrowLeft,
  ArrowRight: lucide.ArrowRight,
  Check: lucide.Check,
  Trash2: lucide.Trash2,
  X: lucide.X,
});

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
  confirm: ICONS.Check as LucideIconData,
  /** Destructive action (danger style). */
  danger: ICONS.Trash2 as LucideIconData,
  /** Cancel / dismiss / close action. */
  cancel: ICONS.X as LucideIconData,
  /** Wizard forward navigation (rendered trailing). */
  next: ICONS.ArrowRight as LucideIconData,
  /** Wizard backward navigation. */
  back: ICONS.ArrowLeft as LucideIconData,
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
