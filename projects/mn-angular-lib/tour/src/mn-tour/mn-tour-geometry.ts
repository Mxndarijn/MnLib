/** A box in viewport coordinates (px), as `getBoundingClientRect()` reports it. */
export type MnTourBox = { top: number; left: number; width: number; height: number };

/** A width and a height (px). */
export type MnTourSize = { width: number; height: number };

/** Air (px) between the target's edge and the highlight's ring. */
export const TOUR_HOLE_PADDING = 6;
/** Gap (px) between the highlight and a card placed beside it. */
export const TOUR_CARD_GAP = 14;
/** Minimum distance (px) a card keeps from the viewport edge. */
export const TOUR_VIEWPORT_MARGIN = 16;

/**
 * Grows a target's box by {@link TOUR_HOLE_PADDING} on every side, so the ring sits around the
 * element instead of on its edge.
 * @param rect The target's box.
 * @param pad Padding to add on every side.
 */
export function padBox(rect: MnTourBox, pad = TOUR_HOLE_PADDING): MnTourBox {
  return { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };
}

/** Whether two boxes differ by more than half a pixel on any edge. */
export function boxChanged(a: MnTourBox | null, b: MnTourBox | null): boolean {
  if (!a || !b) return a !== b;
  return (
    Math.abs(a.top - b.top) > 0.5 ||
    Math.abs(a.left - b.left) > 0.5 ||
    Math.abs(a.width - b.width) > 0.5 ||
    Math.abs(a.height - b.height) > 0.5
  );
}

/** Clamps `value` into `[min, max]`, preferring `min` when the range is empty. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Where a card goes beside a highlight: to the right if it fits, else left, else below, else
 * above, else (nothing fits) below and clamped into the viewport. Along the other axis the card
 * is centred on the highlight and kept {@link TOUR_VIEWPORT_MARGIN} away from the edges.
 * @param hole The highlight's box.
 * @param card The card's rendered size, padding included.
 * @param viewport The viewport's size.
 * @returns The card's top-left corner, in viewport coordinates.
 */
export function placeBeside(hole: MnTourBox, card: MnTourSize, viewport: MnTourSize): { x: number; y: number } {
  const m = TOUR_VIEWPORT_MARGIN;
  const gap = TOUR_CARD_GAP;
  const maxX = viewport.width - card.width - m;
  const maxY = viewport.height - card.height - m;
  const centredY = clamp(hole.top + hole.height / 2 - card.height / 2, m, maxY);
  const centredX = clamp(hole.left + hole.width / 2 - card.width / 2, m, maxX);

  const right = hole.left + hole.width + gap;
  if (right + card.width + m <= viewport.width) return { x: right, y: centredY };

  const left = hole.left - gap - card.width;
  if (left >= m) return { x: left, y: centredY };

  const below = hole.top + hole.height + gap;
  if (below + card.height + m <= viewport.height) return { x: centredX, y: below };

  const above = hole.top - gap - card.height;
  if (above >= m) return { x: centredX, y: above };

  return { x: centredX, y: clamp(below, m, maxY) };
}

/** Whether an element takes up space on screen (not `display: none`, not zero-sized, not hidden). */
function isRendered(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return getComputedStyle(el).visibility !== 'hidden';
}

/**
 * The first rendered element carrying `data-tour="<name>"`, or null. A marker that exists in
 * the DOM but is not rendered (a collapsed drawer's copy of a nav item) does not count.
 * @param name The `data-tour` value.
 * @param root Where to search (default: the document).
 */
export function findTourTarget(name: string, root: ParentNode = document): HTMLElement | null {
  const selector = `[data-tour="${CSS.escape(name)}"]`;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
    if (isRendered(el)) return el;
  }
  return null;
}

/** How often (ms) a waiting step re-checks its target besides reacting to DOM mutations. */
const TARGET_POLL_MS = 50;

/**
 * Resolves with the step's target as soon as it is rendered, or with null after `timeoutMs`.
 * Reacts to DOM mutations and also polls, because an element can become rendered without a
 * mutation in its own subtree (a parent's transition ends, a stylesheet loads). Never waits a
 * fixed delay when the target is already there.
 * @param name The `data-tour` value.
 * @param timeoutMs How long to wait at most.
 * @param isCancelled Stops the wait early (resolving null) once this returns true.
 */
export function waitForTourTarget(
  name: string,
  timeoutMs: number,
  isCancelled: () => boolean = () => false,
): Promise<HTMLElement | null> {
  const found = findTourTarget(name);
  if (found || timeoutMs <= 0) return Promise.resolve(found);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (el: HTMLElement | null): void => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearInterval(poll);
      clearTimeout(timeout);
      resolve(el);
    };
    const check = (): void => {
      if (isCancelled()) {
        finish(null);
        return;
      }
      const el = findTourTarget(name);
      if (el) finish(el);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    const poll = setInterval(check, TARGET_POLL_MS);
    const timeout = setTimeout(() => finish(findTourTarget(name)), timeoutMs);
  });
}
