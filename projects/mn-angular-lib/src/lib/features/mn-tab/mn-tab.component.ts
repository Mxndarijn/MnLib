import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  isSignal,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {MnTranslatePipe} from '../../language';
import {MnCollectionState} from '../mn-collection';
import {MnTabDataSource, MnTabItem} from './mn-tab.types';
import {CommonModule} from '@angular/common';
import {MnBadge} from '../mn-badge';
import {MnSkeleton} from '../mn-skeleton';

/** Fallback number of skeleton tabs when no items are known and no count is given. */
const DEFAULT_SKELETON_TAB_COUNT = 3;

/** Query parameter the active tab is mirrored in unless the data source names another. */
const DEFAULT_TAB_URL_PARAM = 'tab';

/** Key used for a label that slugs to nothing (e.g. punctuation only). */
const FALLBACK_TAB_URL_KEY = 'tab';

/**
 * Slugs a tab label into the value it takes in the URL: the last segment of a
 * translation key, kebab-cased. `matches.hub.tab.entrants` → `entrants`,
 * `members.tabMembers` → `tab-members`.
 * @param label - The tab's label or translation key.
 */
function tabUrlKey(label: string): string {
  const segment = label.split('.').pop() ?? label;
  const slug = segment
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return slug || FALLBACK_TAB_URL_KEY;
}

/**
 * Tab component that renders a horizontal tab bar.
 * Supports translation keys for labels via MnTranslatePipe.
 *
 * The active tab is mirrored in the URL query string by default, so a reload,
 * a back button or a shared link lands on the same tab; see
 * {@link MnTabDataSource.urlParam} to rename that parameter or switch it off.
 */
@Component({
  selector: 'mn-tab',
  standalone: true,
  imports: [MnTranslatePipe, CommonModule, MnBadge, MnSkeleton],
  templateUrl: './mn-tab.component.html',
})
export class MnTabComponent implements DoCheck, AfterViewInit, OnDestroy {
  /**
   * Router the active tab is written to. Optional: a tab bar used outside a
   * routed application still works, it just has no URL to mirror into.
   */
  private readonly router = inject(Router, {optional: true});

  /** Route the tab value is read back from; absent for the same reason as {@link router}. */
  private readonly route = inject(ActivatedRoute, {optional: true});

  /** Watches the URL so a deep link, a back button or an in-app link moves the tab bar. */
  private readonly queryParamsSub?: Subscription;

  /**
   * URL keys of the current items, memoised on the items array so a slug is
   * computed once per tab set rather than on every change-detection pass.
   */
  private urlKeyCache?: { items: MnTabItem[]; keys: string[] };

  /** URL key of {@link currentActive}, so a rebuilt tab set can be recognised as the same tab. */
  private currentKey?: string;

  /**
   * Key of a selection whose URL write has not landed yet. Navigation is
   * asynchronous, so a consumer that rebuilds its tabs in response to the click
   * can be resolved against a URL that still names the previous tab; until the
   * write completes, this is the truth about what the user picked.
   */
  private pendingKey?: string;

  /** Set on destroy so a deferred restore can't announce a tab nobody is showing. */
  private destroyed = false;

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

  constructor() {
    // The URL is a second source of truth for the selection: a deep link, an
    // in-app link into another tab of the page already on screen, or the back
    // button all change it without a click landing on this component.
    this.queryParamsSub = this.route?.queryParamMap.subscribe((params) => {
      const param = this.urlParam();
      if (param) this.activateUrlKey(params.get(param));
    });
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
    this.destroyed = true;
    this.queryParamsSub?.unsubscribe();
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
   * Sets the given tab item as active, invoking deactivate/activate callbacks,
   * and records the selection in the URL so it survives a reload or a share.
   * @param item - The tab item to activate.
   */
  setActive(item: MnTabItem): void {
    if (this.currentActive === item) {
      return;
    }
    this.activate(item);
    this.writeUrl(item);
  }

  /**
   * Moves the selection to `item` and tells the consumer about it: the
   * deactivate/activate/emit sequence a click produces, shared by the click
   * path and the URL-driven ones (deep link, back button), which owe the
   * consumer the same notifications.
   * @param item - The tab item to activate.
   */
  private activate(item: MnTabItem): void {
    this.currentActive?.onDeactivate?.();
    item.onClick?.();
    this.select(item);
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
   * source, preferring the tab named in the URL and falling back to the
   * configured default tab when the current selection is missing or stale
   * (e.g. after the items array is replaced).
   */
  private syncActiveTab(): void {
    const items = this.dataSource?.items;
    if (!items || items.length === 0) {
      if (this.currentActive !== undefined) {
        this.currentActive = undefined;
        this.currentKey = undefined;
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
    const fallback = items[index];
    const restored = this.itemFromUrl(items);
    const previousKey = this.currentKey;
    this.select(restored ?? fallback);
    // Selection resolved from data (not a user click): snap, don't slide.
    this.scheduleIndicator(false);
    if (restored && restored !== fallback && this.currentKey !== previousKey) {
      // The URL asks for a tab the consumer has not rendered, so this selection
      // has to be announced like a click's would be — but only the first time,
      // or a consumer that rebuilds its items array would re-run the tab's
      // callbacks on every rebuild. Deferred out of the change-detection pass
      // that resolved it: the consumer will flip its own state in response, and
      // doing that mid-pass writes to bindings that have already been checked.
      queueMicrotask(() => this.announceRestored(restored));
    }
  }

  /**
   * Records `item` as the selection, remembering its URL key so the same tab is
   * recognised after the consumer rebuilds the items array.
   * @param item - The newly selected tab.
   */
  private select(item: MnTabItem): void {
    const items = this.dataSource.items;
    this.currentActive = item;
    this.currentKey = this.urlKeys(items)[items.indexOf(item)];
  }

  /**
   * Runs the restored tab's callbacks a change-detection pass later, unless the
   * selection moved on in the meantime (a click, or another tab set arriving).
   * @param item - The tab restored from the URL.
   */
  private announceRestored(item: MnTabItem): void {
    if (this.destroyed || this.currentActive !== item) return;
    item.onClick?.();
    this.activeChange.emit(item);
  }

  /**
   * Activates the tab a URL value names, when it is not the tab already on
   * screen. Values naming no known tab are ignored: another tab bar on the page
   * may own that parameter, and a stale link should leave the default standing.
   * @param key - The value read from the query parameter, if any.
   */
  private activateUrlKey(key: string | null): void {
    const items = this.dataSource?.items;
    if (!key || !items?.length) return;
    const item = items[this.urlKeys(items).indexOf(key)];
    if (!item || item === this.currentActive) return;
    this.activate(item);
  }

  /**
   * The query parameter this tab bar mirrors into, or undefined when there is
   * nothing to mirror into (no router) or the consumer switched it off.
   */
  private urlParam(): string | undefined {
    if (!this.router || !this.route) return undefined;
    const param = this.dataSource?.urlParam ?? DEFAULT_TAB_URL_PARAM;
    return param === false || param === '' ? undefined : param;
  }

  /**
   * The tab the current URL asks for, if it names one of `items`.
   * @param items - The tab set to resolve the URL value against.
   */
  private itemFromUrl(items: MnTabItem[]): MnTabItem | undefined {
    const param = this.urlParam();
    if (!param) return undefined;
    const key = this.pendingKey ?? this.route?.snapshot.queryParamMap.get(param);
    if (!key) return undefined;
    const index = this.urlKeys(items).indexOf(key);
    return index === -1 ? undefined : items[index];
  }

  /**
   * Records the active tab in the query string, replacing the current history
   * entry: switching tabs is not a navigation to walk back through, and back
   * should leave the page rather than retrace its tabs.
   * @param item - The tab that just became active.
   */
  private writeUrl(item: MnTabItem): void {
    const param = this.urlParam();
    if (!param || !this.router) return;
    const items = this.dataSource.items;
    const key = this.urlKeys(items)[items.indexOf(item)];
    if (!key) return;
    this.pendingKey = key;
    // No path commands and no `relativeTo`, so only the query string changes.
    // That holds wherever the tab bar sits, including a modal body, which has
    // no route of its own to be relative to.
    void this.router
      .navigate([], {
        queryParams: {[param]: key},
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
      .catch(() => undefined)
      .then(() => {
        // Only clear our own write; a later click already owns the pending key.
        if (this.pendingKey === key) this.pendingKey = undefined;
      });
  }

  /**
   * The URL key of every tab, in item order: the item's `id`, else a slug of
   * its label. Repeats are numbered so each tab still round-trips through the
   * URL; give such tabs an explicit `id` to choose the value yourself.
   * @param items - The tab set to key.
   */
  private urlKeys(items: MnTabItem[]): string[] {
    if (this.urlKeyCache?.items === items) return this.urlKeyCache.keys;
    const used = new Map<string, number>();
    const keys = items.map((item) => {
      const base = item.id ?? tabUrlKey(item.label);
      const taken = used.get(base) ?? 0;
      used.set(base, taken + 1);
      return taken === 0 ? base : `${base}-${taken + 1}`;
    });
    this.urlKeyCache = {items, keys};
    return keys;
  }
}
