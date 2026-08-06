import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  InjectionToken,
  Input,
  OnInit,
  Renderer2,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideChevronDown,
  LucideDynamicIcon,
  LucideEllipsis,
  LucideEllipsisVertical,
  LucideSearchX,
  LucideX,
} from '@lucide/angular';
import { skip } from 'rxjs';
import { MnButton } from '../mn-button';
import { MnBottomSheet } from '../mn-bottom-sheet';
import { MnInputField } from '../mn-input-field';
import { MnConfigService } from '../../config';
import { MN_INSTANCE_ID, MN_SECTION_PATH } from '../../context';
import { MnLanguageService } from '../../language';
import { MnDropdownAction, MnDropdownActionColor, MnDropdownProps, MnDropdownUIConfig } from './mn-dropdownTypes';
import { mnDropdownTriggerVariants } from './mn-dropdownVariants';

export const MN_DROPDOWN_CONFIG = new InjectionToken<MnDropdownUIConfig>('MN_DROPDOWN_CONFIG');

/** Foreground class per action colour token, matching mn-button's text variants. */
const ACTION_COLOR_CLASS: Record<MnDropdownActionColor, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  danger: 'text-error',
  warning: 'text-warning',
  success: 'text-success',
  accent: 'text-accent',
  gray: 'text-base-content/70',
};

/**
 * A ⋯ command menu. The trigger opens a `role="menu"` list of {@link MnDropdownAction}s
 * that each fire and dismiss on choice — a *command* menu, not a value picker, so it is
 * intentionally not a ControlValueAccessor.
 *
 * Presentation mirrors mn-multi-select: an anchored popover on desktop and the shared
 * {@link MnBottomSheet} on mobile (< 640px). Both the popover and the sheet host are
 * portalled to `document.body` so their `position: fixed` anchors to the viewport rather
 * than any transformed/filtered ancestor (a table cell, a card) — the same root-cause fix
 * the multi-select applies.
 */
@Component({
  selector: 'mn-lib-dropdown',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, FormsModule, MnButton, MnBottomSheet, MnInputField, LucideEllipsisVertical, LucideEllipsis, LucideChevronDown, LucideX, LucideSearchX, LucideDynamicIcon],
  templateUrl: './mn-dropdown.html',
  styleUrl: './mn-dropdown.css',
})
export class MnDropdown implements OnInit {
  @Input({ required: true }) props!: MnDropdownProps;

  protected uiConfig: MnDropdownUIConfig = {};

  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, { optional: true }) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, { optional: true });
  private readonly elRef = inject(ElementRef);
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly renderer = inject(Renderer2);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Reference to the trigger element for positioning the popover. Read as an
   *  `ElementRef` because `button[mnButton]` is a component — the default query would
   *  otherwise return the MnButton instance, which has no `nativeElement`. */
  @ViewChild('trigger', { static: false, read: ElementRef }) triggerRef!: ElementRef<HTMLElement>;

  /**
   * Layout classes for the anchored popover panel. Searchable menus become a flex column
   * so the search box can be pinned (`shrink-0`) above a single scrolling list region —
   * paired with {@link panelFloorPx}, that keeps the popover a fixed height while the
   * filter runs, instead of the panel resizing on every keystroke. The mobile sheet is
   * rendered by mn-bottom-sheet instead, so it needs no branch here.
   */
  get panelClasses(): string {
    const base =
      'fixed z-9999 min-w-48 max-w-[min(20rem,90vw)] bg-base-100 border border-base-300 rounded-md shadow-lg py-1 max-h-[60vh] -translate-x-full';
    return this.isSearchable ? `${base} flex flex-col overflow-hidden` : `${base} overflow-auto`;
  }

  /** Tailwind's `sm` breakpoint — below this the menu renders as a bottom sheet.
   *  Kept in step with the same constant in mn-bottom-sheet / mn-multi-select. */
  private static readonly SHEET_MAX_WIDTH = 639.98;

  /** The anchored popover panel currently moved into `document.body`, if any. */
  private movedPanel: HTMLElement | null = null;
  /** The bottom-sheet host currently moved into `document.body`, if any. */
  private movedSheet: HTMLElement | null = null;

  /** Whether the viewport is currently narrow enough for the sheet layout. */
  private isNarrowViewport = false;
  /** Live breakpoint match, so rotating the device re-evaluates the layout. */
  private sheetMedia: MediaQueryList | null = null;
  /** The listener registered on `sheetMedia`, retained for teardown. */
  private sheetMediaListener: ((event: MediaQueryListEvent) => void) | null = null;

  /** `document.body`'s inline `overflow` before the sheet locked it, restored on close. */
  private previousBodyOverflow: string | null = null;

  /**
   * The anchored popover's opened height, locked so a shorter filtered list cannot resize
   * it mid-type. Captured on the frame after the panel appears (with the full, unfiltered
   * list), so applying it is jump-free — it only stops a later shrink. Null while closed
   * or when the menu is not searchable, leaving the plain content-height popover untouched.
   */
  panelFloorPx: number | null = null;

  /**
   * The mobile sheet's opened height, applied as a `min-height` floor for the same reason
   * as {@link panelFloorPx} — mirroring mn-multi-select's sheet floor. Null while anchored,
   * closed, or non-searchable.
   */
  sheetFloorPx: number | null = null;

  /** Watches the trigger while open, so the panel closes if the trigger is hidden. */
  private visibilityObserver: IntersectionObserver | null = null;
  /** Capture-phase scroll listener installed while open, closing on any ancestor scroll. */
  private scrollCapture: ((event: Event) => void) | null = null;

  isOpen = false;

  /** Current text in the search input, cleared on close. Only meaningful when the menu
   *  is {@link MnDropdownProps.searchable}. */
  searchTerm = '';

  /** Popover position computed from the trigger's bounding rect. */
  dropdownStyle: { top: string; left: string } = { top: '0px', left: '0px' };

  /**
   * The popover panel, relocated to `document.body` on appearance (see mn-multi-select's
   * portal rationale) and detached when the query clears on close/destroy.
   */
  @ViewChild('dropdown', { static: false })
  set dropdownRef(ref: ElementRef<HTMLElement> | undefined) {
    const el = ref?.nativeElement ?? null;
    this.movedPanel = this.portal(el, this.movedPanel);
    if (el && this.isSearchable) {
      this.capturePanelFloor(el);
    } else if (!el) {
      this.panelFloorPx = null;
    }
  }

  /**
   * The bottom-sheet host, relocated to `document.body` so its `position: fixed`
   * children anchor to the viewport rather than a transformed ancestor.
   */
  @ViewChild('sheet', { static: false, read: ElementRef })
  set sheetRef(ref: ElementRef<HTMLElement> | undefined) {
    const el = ref?.nativeElement ?? null;
    this.movedSheet = this.portal(el, this.movedSheet);
    if (el && this.isSearchable) {
      this.captureSheetFloor(el);
    } else if (!el) {
      this.sheetFloorPx = null;
    }
  }

  ngOnInit(): void {
    this.resolveConfig();
    this.startWatchingViewport();

    const sub = this.lang.locale$.pipe(skip(1)).subscribe(() => {
      this.resolveConfig();
      this.cdr.markForCheck();
    });
    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      this.stopWatchingTrigger();
      this.stopWatchingViewport();
      this.unlockBodyScroll();
      // Guarantee the portalled elements never outlive the component.
      this.movedPanel = this.portal(null, this.movedPanel);
      this.movedSheet = this.portal(null, this.movedSheet);
    });
  }

  private resolveConfig(): void {
    const instanceId = this.explicitInstanceId || `mn-dropdown-${this.props.id}`;
    this.uiConfig = this.configService.resolve<MnDropdownUIConfig>(
      'mn-dropdown',
      this.sectionPath,
      instanceId,
    );
  }

  // ── Breakpoint watching ──

  private startWatchingViewport(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    this.sheetMedia = window.matchMedia(`(max-width: ${MnDropdown.SHEET_MAX_WIDTH}px)`);
    this.isNarrowViewport = this.sheetMedia.matches;

    this.sheetMediaListener = (event: MediaQueryListEvent) => {
      this.isNarrowViewport = event.matches;
      this.close();
      // The listener fires outside Angular, so a zoneless app needs an explicit nudge.
      this.cdr.markForCheck();
    };
    this.sheetMedia.addEventListener('change', this.sheetMediaListener);
  }

  private stopWatchingViewport(): void {
    if (this.sheetMedia && this.sheetMediaListener) {
      this.sheetMedia.removeEventListener('change', this.sheetMediaListener);
    }
    this.sheetMedia = null;
    this.sheetMediaListener = null;
  }

  // ── Open / close ──

  toggle(): void {
    if (this.isOpen) {
      this.close();
      return;
    }
    if (this.props.actions.length === 0) return;
    this.isOpen = true;
    if (this.isSheet) {
      // A sheet is anchored to the viewport, so it needs no trigger tracking — only a
      // scroll lock so the page behind it stays put.
      this.lockBodyScroll();
      return;
    }
    this.updateDropdownPosition();
    this.startWatchingTrigger();
  }

  /** The single close path, so every open-only listener is torn down with the panel. */
  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.searchTerm = '';
    this.panelFloorPx = null;
    this.sheetFloorPx = null;
    this.stopWatchingTrigger();
    this.unlockBodyScroll();
  }

  /** Whether the menu should currently render as a bottom sheet. */
  get isSheet(): boolean {
    return this.props.mobileSheet !== false && this.isNarrowViewport;
  }

  /** Fires an action and closes. Ignores disabled items defensively. */
  select(action: MnDropdownAction): void {
    if (action.disabled) return;
    this.close();
    action.run();
  }

  // ── Search ──

  /** Whether the filter input is shown — the explicit `searchable` prop, off by default. */
  get isSearchable(): boolean {
    return this.props.searchable === true;
  }

  /**
   * Records the current filter text as the search input changes. The input's
   * ControlValueAccessor emits `null` for an empty field (its text adapter maps `''` to
   * `null`), so coerce to `''` — otherwise clearing or backspacing the box would leave
   * `searchTerm` null and {@link filteredActions}'s `.trim()` would throw, freezing the menu.
   */
  onSearch(term: string | null): void {
    this.searchTerm = term ?? '';
  }

  /**
   * The actions currently passing the filter, in their declared order. Every action when
   * the menu is not searchable or the box is empty; otherwise those whose resolved label
   * or {@link MnDropdownAction.keywords} contain the (case-insensitive) query.
   */
  get filteredActions(): MnDropdownAction[] {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!this.isSearchable || !term) return this.props.actions;
    return this.props.actions.filter(action => {
      const haystack = `${this.actionLabel(action)} ${action.keywords ?? ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  /**
   * Runs the first still-visible, enabled action — the Enter key's target, matching a
   * help search where Enter opens the top hit. No-op when nothing matches.
   */
  selectFirstVisible(): void {
    const first = this.filteredActions.find(action => !action.disabled);
    if (first) this.select(first);
  }

  // ── Positioning ──

  private updateDropdownPosition(): void {
    if (!this.triggerRef) return;
    const rect = this.triggerRef.nativeElement.getBoundingClientRect();
    // The panel is right-aligned to the trigger via a `-translate-x-full` class, so
    // `left` is anchored to the trigger's right edge.
    this.dropdownStyle = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.right}px`,
    };
  }

  private startWatchingTrigger(): void {
    this.stopWatchingTrigger();

    const trigger = this.triggerRef?.nativeElement;
    if (trigger && typeof IntersectionObserver !== 'undefined') {
      this.visibilityObserver = new IntersectionObserver(entries => {
        if (!entries.some(entry => !entry.isIntersecting)) return;
        this.close();
        this.cdr.markForCheck();
      });
      this.visibilityObserver.observe(trigger);
    }

    this.scrollCapture = (event: Event) => {
      const target = event.target as Node | null;
      if (target && this.movedPanel && (this.movedPanel === target || this.movedPanel.contains(target))) {
        return;
      }
      this.close();
      this.cdr.markForCheck();
    };
    document.addEventListener('scroll', this.scrollCapture, true);
  }

  private stopWatchingTrigger(): void {
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;
    if (this.scrollCapture) {
      document.removeEventListener('scroll', this.scrollCapture, true);
      this.scrollCapture = null;
    }
  }

  // ── Global dismissal ──

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as Node | null;
    const insideHost = !!target && this.elRef.nativeElement.contains(target);
    const insidePanel = !!target && !!this.movedPanel && this.movedPanel.contains(target);
    const insideSheet = !!target && !!this.movedSheet && this.movedSheet.contains(target);
    if (!insideHost && !insidePanel && !insideSheet) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isOpen) return;
    this.close();
    // Return focus to the trigger so keyboard users are not stranded.
    this.triggerRef?.nativeElement.focus();
  }

  @HostListener('window:scroll', [])
  @HostListener('window:resize', [])
  onWindowScrollOrResize(): void {
    // A sheet is viewport-anchored, so it has no stale position to escape; closing it on
    // the `resize` a soft keyboard fires would also be wrong. The matchMedia listener
    // handles a genuine layout switch instead.
    if (this.isSheet) return;
    this.close();
  }

  // ── Body scroll lock (sheet only) ──

  private lockBodyScroll(): void {
    if (this.previousBodyOverflow !== null) return;
    this.previousBodyOverflow = document.body.style.overflow;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
  }

  private unlockBodyScroll(): void {
    if (this.previousBodyOverflow === null) return;
    if (this.previousBodyOverflow) {
      this.renderer.setStyle(document.body, 'overflow', this.previousBodyOverflow);
    } else {
      this.renderer.removeStyle(document.body, 'overflow');
    }
    this.previousBodyOverflow = null;
  }

  // ── Height floors (searchable only) ──

  /**
   * Records the anchored popover's opened height and locks it via {@link panelFloorPx}.
   * Measured on the next frame so the read reflects the fully-rendered, unfiltered list
   * (the search box is empty on open) and never forces a reflow mid change-detection. The
   * value equals the current height, so applying it is jump-free — it only stops a later,
   * shorter filtered list from shrinking the panel.
   */
  private capturePanelFloor(panelEl: HTMLElement): void {
    if (typeof requestAnimationFrame !== 'function') {
      this.panelFloorPx = panelEl.offsetHeight;
      return;
    }
    requestAnimationFrame(() => {
      // The panel may have closed (or the query cleared) before the frame ran.
      if (!this.isOpen || this.movedPanel !== panelEl) return;
      this.panelFloorPx = panelEl.offsetHeight;
      this.cdr.markForCheck();
    });
  }

  /**
   * Records the sheet's opened height as its `min-height` floor, on the same next-frame
   * basis as {@link capturePanelFloor}. `hostEl` is the portalled mn-bottom-sheet host
   * (`display: contents`), so the height is read from its `.mn-sheet-container` child.
   */
  private captureSheetFloor(hostEl: HTMLElement): void {
    const measure = (): number => {
      const container = hostEl.querySelector<HTMLElement>('.mn-sheet-container');
      return container?.offsetHeight ?? hostEl.offsetHeight;
    };
    if (typeof requestAnimationFrame !== 'function') {
      this.sheetFloorPx = measure();
      return;
    }
    requestAnimationFrame(() => {
      if (!this.isOpen || this.movedSheet !== hostEl) return;
      this.sheetFloorPx = measure();
      this.cdr.markForCheck();
    });
  }

  // ── Portal helper (see mn-multi-select for the full rationale) ──

  private portal(el: HTMLElement | null, current: HTMLElement | null): HTMLElement | null {
    if (el) {
      if (current === el) return current;
      this.renderer.appendChild(document.body, el);
      return el;
    }
    if (current) {
      const parent = current.parentNode;
      if (parent) {
        this.renderer.removeChild(parent, current);
      }
    }
    return null;
  }

  // ── Resolved presentation ──

  /** The label shown for an action, preferring a resolved translation key. */
  actionLabel(action: MnDropdownAction): string {
    const translated = action.labelKey ? this.lang.translateIfPresent(action.labelKey) : undefined;
    return translated ?? action.label ?? '';
  }

  /**
   * Whether an icon was supplied as a `TemplateRef` rather than lucide icon data, which
   * decides how the template renders it. Kept as a method (not a pipe) so the narrowing
   * is available inline in the item loop.
   * @param value The icon to test.
   * @returns True when the icon is a template the caller owns.
   */
  isTemplateRef(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef;
  }

  /**
   * Foreground class for an item: an explicit {@link MnDropdownAction.color}, else the
   * destructive red for a {@link MnDropdownAction.danger} item, else the default text.
   */
  actionColorClass(action: MnDropdownAction): string {
    if (action.color) return ACTION_COLOR_CLASS[action.color];
    if (action.danger) return ACTION_COLOR_CLASS.danger;
    return 'text-base-content';
  }

  /** Accessible name for the ⋯ trigger button. */
  get triggerAriaLabel(): string {
    const translated = this.props.ariaLabelKey ? this.lang.translateIfPresent(this.props.ariaLabelKey) : undefined;
    return translated ?? this.props.ariaLabel ?? this.uiConfig.ariaLabel ?? 'Actions';
  }

  /** The visible text on the trigger, or null for an icon-only ⋯ trigger. */
  get triggerLabelText(): string | null {
    const translated = this.props.triggerLabelKey ? this.lang.translateIfPresent(this.props.triggerLabelKey) : undefined;
    return translated ?? this.props.triggerLabel ?? null;
  }

  /** Which glyph the trigger renders: an explicit choice, else a chevron when the
   *  trigger is labelled and the vertical dots when it is icon-only. */
  get resolvedTriggerIcon(): 'dots-vertical' | 'dots-horizontal' | 'chevron' | 'none' {
    return this.props.triggerIcon ?? (this.triggerLabelText ? 'chevron' : 'dots-vertical');
  }

  /** Heading shown above the menu/sheet, or null when none is configured. */
  get menuLabel(): string | null {
    const translated = this.props.menuLabelKey ? this.lang.translateIfPresent(this.props.menuLabelKey) : undefined;
    return translated ?? this.props.menuLabel ?? this.uiConfig.menuLabel ?? null;
  }

  /** Accessible label for the sheet's close button. */
  get closeLabel(): string {
    return this.uiConfig.closeLabel ?? 'Close';
  }

  /** Placeholder shown in the search input, preferring a resolved translation key. */
  get searchPlaceholder(): string {
    const translated = this.props.searchPlaceholderKey ? this.lang.translateIfPresent(this.props.searchPlaceholderKey) : undefined;
    return translated ?? this.props.searchPlaceholder ?? this.uiConfig.searchPlaceholder ?? 'Search...';
  }

  /** Text shown in place of the list when the filter matches no actions. */
  get searchEmptyLabel(): string {
    const translated = this.props.searchEmptyLabelKey ? this.lang.translateIfPresent(this.props.searchEmptyLabelKey) : undefined;
    return translated ?? this.props.searchEmptyLabel ?? this.uiConfig.searchEmptyLabel ?? 'No results';
  }

  get triggerClasses(): string {
    return mnDropdownTriggerVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      labeled: !!this.triggerLabelText,
    });
  }

  get resolvedId(): string {
    return this.props.id;
  }
}
