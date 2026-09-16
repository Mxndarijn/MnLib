/**
 * Keyboard navigation shared by mn-select and mn-multi-select. Both follow the WAI-ARIA combobox
 * pattern: focus stays on the trigger (or the search box) and `aria-activedescendant` names the
 * option the arrow keys are on, so the options themselves are never Tab stops.
 */

/**
 * The index of the next option that can be chosen, stepping from `from` in one direction without
 * wrapping. From no active option (-1), a forward step lands on the first enabled option and a
 * backward step on the last, which is also how Home and End are answered.
 * @param options - The options as rendered, in order.
 * @param from - The current active index, or -1 for none.
 * @param step - 1 to move down the list, -1 to move up.
 * @param isEnabled - Whether an option can be highlighted; disabled rows are skipped.
 * @returns The new index; `from` when nothing enabled lies that way, or -1 when `from` is out of range.
 */
export function stepEnabledIndex<T>(
  options: readonly T[],
  from: number,
  step: 1 | -1,
  isEnabled: (option: T) => boolean,
): number {
  const valid = from >= 0 && from < options.length;
  let index = valid ? from : step === 1 ? -1 : options.length;
  for (index += step; index >= 0 && index < options.length; index += step) {
    if (isEnabled(options[index])) return index;
  }
  return valid ? from : -1;
}

/**
 * Scrolls the nearest scrollable ancestor just far enough to show an option. Written out rather than
 * `scrollIntoView` because that also scrolls the page, and a page scroll closes an anchored panel.
 * @param option - The option element, or null when it is not rendered.
 */
export function scrollOptionIntoView(option: HTMLElement | null): void {
  if (!option) return;
  let scroller = option.parentElement;
  while (scroller && scroller !== document.body && scroller.scrollHeight <= scroller.clientHeight) {
    scroller = scroller.parentElement;
  }
  if (!scroller || scroller === document.body) return;
  const box = scroller.getBoundingClientRect();
  const row = option.getBoundingClientRect();
  if (row.top < box.top) {
    scroller.scrollTop -= box.top - row.top;
  } else if (row.bottom > box.bottom) {
    scroller.scrollTop += row.bottom - box.bottom;
  }
}
