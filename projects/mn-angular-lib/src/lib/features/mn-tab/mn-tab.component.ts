import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  Input,
  isSignal,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import {MnTranslatePipe} from '../../language';
import {MnCollectionState} from '../mn-collection';
import {MnTabDataSource, MnTabItem} from './mn-tab.types';
import {CommonModule} from '@angular/common';
import {MnBadge} from '../mn-badge';
import {MnSkeleton} from '../mn-skeleton';

/** Fallback number of skeleton tabs when no items are known and no count is given. */
const DEFAULT_SKELETON_TAB_COUNT = 3;

/**
 * Tab component that renders a horizontal tab bar.
 * Supports translation keys for labels via MnTranslatePipe.
 */
@Component({
  selector: 'mn-tab',
  standalone: true,
  imports: [MnTranslatePipe, CommonModule, MnBadge, MnSkeleton],
  templateUrl: './mn-tab.component.html',
})
export class MnTabComponent implements DoCheck, AfterViewInit, OnDestroy {
  /** The horizontally-scrolling wrapper the edge fade is painted onto. */
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLElement>;

  /** The tab row; queried for the active tab so the indicator can measure it. */
  @ViewChild('tabList') private tabList?: ElementRef<HTMLElement>;

  /** The shared underline that slides to the active tab. */
  @ViewChild('indicator') private indicator?: ElementRef<HTMLElement>;

  /** Pending indicator remeasure, cancelled on destroy so a post-destroy frame can't read a detached ref. */
  private indicatorFrame?: number;

  /**
   * True while a click-initiated slide is animating. The active tab's
   * `font-bold` widens the row, which fires {@link resizeObserver}; without
   * this guard the observer's snap ({@link updateIndicator} with `animate:
   * false`) would land the indicator at its target the same frame the slide
   * starts, so the transition never paints. Set synchronously in
   * {@link setActive} — before the frame runs — so the guard doesn't depend on
   * rAF-vs-ResizeObserver callback ordering.
   */
  private sliding = false;

  /** Clears {@link sliding} after the slide finishes; re-armed per click, cancelled on destroy. */
  private slidingTimer?: number;

  /** Slide duration in ms; matches the indicator's `duration-300` transition. */
  private static readonly SLIDE_MS = 300;

  /** How far the fade reaches in from each overflowing edge. */
  private static readonly FADE = '2rem';
  /** Data source containing tab items and default active index. */
  @Input() dataSource!: MnTabDataSource;

  /**
   * Whether to enable horizontal scrolling when items overflow.
   * When true, tabs scroll horizontally instead of overflowing their container.
   *
   * Defaults to `true`: the tab bar never wraps (`flex-nowrap`), so without
   * scrolling an overflowing bar would clip its last tabs or push the page width
   * on narrow screens. When the tabs already fit, `overflow-x-auto` is a no-op,
   * so this default only ever changes behaviour for the overflow case it fixes.
   */
  @Input() scrollable = true;

  /**
   * Whether tabs should stretch to fill the available width.
   * Defaults to false, so tabs only take as much space as their content.
   */
  @Input() justified = false;

  /** Emits the newly activated tab item whenever the active tab changes. */
  @Output() activeChange = new EventEmitter<MnTabItem>();

  /** The currently active tab item. */
  currentActive?: MnTabItem;

  /** Watches the wrapper and the tab row so the fade re-evaluates on width or content changes. */
  private resizeObserver?: ResizeObserver;

  /**
   * Whether the tab bar is loading and should render skeleton tabs, from
   * {@link MnTabDataSource.state}.
   */
  get isLoadingState(): boolean {
    return this.dataSource.state === MnCollectionState.LOADING;
  }

  /**
   * Index array sizing the loading skeleton: `skeletonCount` when provided,
   * otherwise the number of known items, falling back to a default when none.
   */
  get skeletonTabs(): number[] {
    const count =
      this.dataSource.skeletonCount ??
      (this.dataSource.items.length || DEFAULT_SKELETON_TAB_COUNT);
    return Array.from({length: count}, (_, index) => index);
  }

  /**
   * Re-resolves the active tab on every change-detection pass.
   *
   * The data source is often populated or rebuilt asynchronously (tabs that
   * depend on fetched data or permissions). Resolving the active tab only once
   * at init would leave {@link currentActive} pointing at a stale item — the
   * tab bar would then highlight nothing and swallow the first click — so the
   * selection is kept in sync with whatever the data source currently holds.
   */
  ngDoCheck(): void {
    this.syncActiveTab();
  }

  /**
   * Starts watching the scroll wrapper so the edge fade stays honest. A scroll
   * moves the fade to whichever side now hides tabs; a resize (viewport change)
   * or a change to the tab row's width (tabs added, relabelled, skeleton →
   * loaded) re-checks whether either edge overflows at all.
   */
  ngAfterViewInit(): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.updateEdgeFades();
      // Tabs may have reflowed (viewport change, justified widths); snap the
      // indicator to the new geometry — animating a resize tick reads as jank.
      // But skip the snap mid-slide: a click's own `font-bold` resizes the row
      // and fires this observer, and snapping there kills the slide it triggered.
      if (!this.sliding) this.updateIndicator(false);
    });
    this.resizeObserver.observe(el);
    if (el.firstElementChild) this.resizeObserver.observe(el.firstElementChild);
    this.updateEdgeFades();
    // Place the indicator on the default tab without a slide-in from zero.
    this.updateIndicator(false);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.indicatorFrame !== undefined) cancelAnimationFrame(this.indicatorFrame);
    if (this.slidingTimer !== undefined) clearTimeout(this.slidingTimer);
  }

  /**
   * Paints a fade over whichever edge has tabs scrolled out of view — a soft
   * dissolve that reads as "more this way", the affordance a hidden scrollbar
   * otherwise costs us. Uses a mask (content → transparent) rather than a
   * background-coloured overlay, so it needs no knowledge of the theme.
   */
  updateEdgeFades(): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;
    const fadeStart = el.scrollLeft > 1;
    const fadeEnd = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    const f = MnTabComponent.FADE;
    let mask = '';
    if (this.scrollable && fadeStart && fadeEnd) {
      mask = `linear-gradient(to right, transparent 0, #000 ${f}, #000 calc(100% - ${f}), transparent 100%)`;
    } else if (this.scrollable && fadeStart) {
      mask = `linear-gradient(to right, transparent 0, #000 ${f}, #000 100%)`;
    } else if (this.scrollable && fadeEnd) {
      mask = `linear-gradient(to right, #000 0, #000 calc(100% - ${f}), transparent 100%)`;
    }
    el.style.maskImage = mask;
    el.style.setProperty('-webkit-mask-image', mask);
  }

  /**
   * Sets the given tab item as active, invoking deactivate/activate callbacks.
   * @param item - The tab item to activate.
   */
  setActive(item: MnTabItem): void {
    if (this.currentActive === item) {
      return;
    }
    this.currentActive?.onDeactivate?.();
    item.onClick?.();
    this.currentActive = item;
    this.activeChange.emit(item);
    // Slide the underline to the new tab. Measure on the next frame, after
    // change detection has applied the active tab's `font-bold` (which widens
    // it) so the indicator lands on the final, bolded geometry. Guard the slide
    // against the resize snap the same `font-bold` triggers (see {@link sliding}).
    this.beginSlide();
    this.scheduleIndicator(true);
  }

  /**
   * Marks a click-driven slide as in progress and schedules the guard to lift
   * once the transition has finished. A timeout (not `transitionend`) so the
   * flag still clears under `motion-reduce`, where no transition event fires.
   */
  private beginSlide(): void {
    this.sliding = true;
    if (this.slidingTimer !== undefined) clearTimeout(this.slidingTimer);
    this.slidingTimer = setTimeout(() => {
      this.slidingTimer = undefined;
      this.sliding = false;
    }, MnTabComponent.SLIDE_MS) as unknown as number;
  }

  /**
   * Moves the shared underline to the active tab. When `animate` is false the
   * move is snapped (no slide) by disabling the transition for one reflow —
   * used on init, async selection and resize, where a slide would read as jank.
   * @param animate - Whether the move should slide (true) or snap (false).
   */
  private updateIndicator(animate: boolean): void {
    const bar = this.indicator?.nativeElement;
    const list = this.tabList?.nativeElement;
    if (!bar || !list) return;
    const active = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!active) {
      bar.style.opacity = '0';
      return;
    }
    if (!animate) bar.style.transition = 'none';
    bar.style.opacity = '1';
    bar.style.width = `${active.offsetWidth}px`;
    bar.style.transform = `translateX(${active.offsetLeft}px)`;
    if (!animate) {
      // Force a reflow so the snapped values apply before the transition is
      // restored, then hand animation back to the CSS class.
      void bar.offsetWidth;
      bar.style.transition = '';
    }
  }

  /**
   * Remeasures the indicator on the next animation frame, so the read happens
   * after layout reflects the latest active-tab classes. Coalesces bursts and
   * is cancellable on destroy.
   * @param animate - Whether the resulting move should slide.
   */
  private scheduleIndicator(animate: boolean): void {
    if (this.indicatorFrame !== undefined) cancelAnimationFrame(this.indicatorFrame);
    this.indicatorFrame = requestAnimationFrame(() => {
      this.indicatorFrame = undefined;
      this.updateIndicator(animate);
    });
  }

  /**
   * Returns the resolved badge value for a tab item, supporting both plain numbers and Signal<number>.
   * @param item - The tab item whose badge to resolve.
   */
  getBadge(item: MnTabItem): number | undefined {
    if (isSignal(item.badge)) return item.badge();
    return item.badge;
  }

  /**
   * Ensures {@link currentActive} references a tab that still exists in the data
   * source, falling back to the configured default tab when the current
   * selection is missing or stale (e.g. after the items array is replaced).
   */
  private syncActiveTab(): void {
    const items = this.dataSource?.items;
    if (!items || items.length === 0) {
      if (this.currentActive !== undefined) {
        this.currentActive = undefined;
        this.scheduleIndicator(false);
      }
      return;
    }
    if (this.currentActive && items.includes(this.currentActive)) {
      return;
    }
    const defaultIndex = this.dataSource.defaultActive;
    const index =
      defaultIndex >= 0 && defaultIndex < items.length ? defaultIndex : 0;
    this.currentActive = items[index];
    // Selection resolved from data (not a user click): snap, don't slide.
    this.scheduleIndicator(false);
  }
}
