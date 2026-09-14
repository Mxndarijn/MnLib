/**
 * Where a `position: fixed` panel anchored to a trigger should open, and how tall it may be.
 *
 * Shared by the select, the multi-select and the dropdown, which all used to pin their panel
 * to the trigger's bottom edge unconditionally — so a trigger near the bottom of the viewport
 * (a table's "items per page" picker is the classic case) opened a list that ran off screen.
 */
export type AnchoredPanelPlacement = {
  /** The `top` style, or `auto` when the panel opens above the trigger. */
  top: string;
  /** The `bottom` style, or `auto` when the panel opens below the trigger. */
  bottom: string;
  /**
   * The `max-height` style: the room on the chosen side, so a long list scrolls inside the
   * viewport instead of past its edge, or `null` when the panel's own cap is smaller anyway.
   */
  maxHeight: string | null;
};

/** Breathing room kept between the panel and the viewport edge, in pixels. */
export const PANEL_VIEWPORT_MARGIN_PX = 8;

/**
 * The least room below the trigger before the panel is flipped above it, in pixels: roughly
 * four rows, so a picker that still fits its usual few options never flips for no reason.
 */
export const PANEL_FLIP_THRESHOLD_PX = 160;

/**
 * Chooses the side of the trigger with room for the panel.
 *
 * Below by default. Above only when the space below is under {@link PANEL_FLIP_THRESHOLD_PX}
 * and the space above is larger: flipping is the exception, because a list that opens upward
 * reads backwards from what the trigger's chevron promised.
 * @param trigger The trigger's viewport rectangle.
 * @param viewportHeight The viewport's inner height.
 * @param gap Distance between trigger and panel, in pixels.
 * @param panelMaxHeight The panel's own height cap in pixels, so the available room only
 * becomes the cap when it is the smaller of the two.
 * @returns The styles to bind on the panel.
 */
export function anchoredPanelPlacement(
  trigger: Pick<DOMRect, 'top' | 'bottom'>,
  viewportHeight: number,
  gap: number,
  panelMaxHeight: number,
): AnchoredPanelPlacement {
  const below = viewportHeight - trigger.bottom - gap - PANEL_VIEWPORT_MARGIN_PX;
  const above = trigger.top - gap - PANEL_VIEWPORT_MARGIN_PX;
  const openAbove = below < PANEL_FLIP_THRESHOLD_PX && above > below;
  const room = Math.max(openAbove ? above : below, 0);
  return {
    top: openAbove ? 'auto' : `${trigger.bottom + gap}px`,
    bottom: openAbove ? `${viewportHeight - trigger.top + gap}px` : 'auto',
    maxHeight: room < panelMaxHeight ? `${room}px` : null,
  };
}
