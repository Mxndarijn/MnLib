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
  LucideEllipsisVertical,
  LucideIconData,
  LucideSearchX,
  LucideX,
} from '@lucide/angular';
import { skip } from 'rxjs';
import { MnButton, MnButtonTypes } from '../mn-button';
import { MnBottomSheet } from '../mn-bottom-sheet';
import { MnInputField } from '../mn-input-field';
import { MnConfigService } from '../../config';
import { MN_INSTANCE_ID, MN_SECTION_PATH } from '../../context';
import { MnLanguageService } from '../../language';
import { MnDropdownAction, MnDropdownActionColor, MnDropdownItem, MnDropdownProps, MnDropdownSeparator, MnDropdownUIConfig } from './mn-dropdownTypes';
import { mnDropdownTriggerVariants } from './mn-dropdownVariants';

export const MN_DROPDOWN_CONFIG = new InjectionToken<MnDropdownUIConfig>('MN_DROPDOWN_CONFIG');

/** Counter backing the auto-generated {@link MnDropdownProps.id} when a caller omits one. */
let nextDropdownId = 0;

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
  imports: [NgClass, NgTemplateOutlet, FormsModule, MnButton, MnBottomSheet, MnInputField, LucideX, LucideSearchX, LucideDynamicIcon],
  templateUrl: './mn-dropdown.html',
  styleUrl: './mn-dropdown.css',
})
export class MnDropdown implements OnInit {
  @Input({ required: true }) datasource!: MnDropdownProps;

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
   * The anchored popover's opened width, locked for the same reason as {@link panelFloorPx}:
   * the panel is content-sized between its `min-w`/`max-w` bounds, so a filtered list that
   * drops the widest item would otherwise shrink the popover mid-type. Captured on the same
   * next-frame pass as the height, so applying it is jump-free. Null while closed or when the
   * menu is not searchable, leaving the plain content-width popover untouched.
   */
  panelWidthPx: number | null = null;

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

  /** Stable fallback id, used when {@link MnDropdownProps.id} is omitted. Generated once per
   *  instance so the a11y wiring (menu id, `aria-controls`, the search input) stays valid. */
  private readonly autoId = `mn-dropdown-${++nextDropdownId}`;

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
      this.panelWidthPx = null;
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
    const instanceId = this.explicitInstanceId || `mn-dropdown-${this.resolvedId}`;
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
    if (this.datasource.actions.length === 0) return;
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
    this.panelWidthPx = null;
    this.sheetFloorPx = null;
    this.stopWatchingTrigger();
    this.unlockBodyScroll();
  }

  /** Whether the menu should currently render as a bottom sheet. */
  get isSheet(): boolean {
    return this.datasource.mobileSheet !== false && this.isNarrowViewport;
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
    return this.datasource.searchable === true;
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
  get filteredActions(): MnDropdownItem[] {
    const term = (this.searchTerm ?? '').trim().toLowerCase();
    if (!this.isSearchable || !term) return this.datasource.actions;
    // While filtering, separators are dropped — a divider stranded between or after hidden
    // results is meaningless — so match only real actions.
    return this.datasource.actions.filter(item => {
      if (this.isSeparator(item)) return false;
      const haystack = `${this.actionLabel(item)} ${item.keywords ?? ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  /**
   * Runs the first still-visible, enabled action — the Enter key's target, matching a
   * help search where Enter opens the top hit. Skips separators. No-op when nothing matches.
   */
  selectFirstVisible(): void {
    const first = this.filteredActions.find(
      (item): item is MnDropdownAction => !this.isSeparator(item) && !item.disabled,
    );
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
   * Records the anchored popover's opened height and width, locking them via
   * {@link panelFloorPx} / {@link panelWidthPx}. Measured on the next frame so the read
   * reflects the fully-rendered, unfiltered list (the search box is empty on open) and never
   * forces a reflow mid change-detection. Both values equal the current dimensions, so
   * applying them is jump-free — they only stop a later, shorter/narrower filtered list from
   * shrinking the panel.
   */
  private capturePanelFloor(panelEl: HTMLElement): void {
    if (typeof requestAnimationFrame !== 'function') {
      this.panelFloorPx = panelEl.offsetHeight;
      this.panelWidthPx = panelEl.offsetWidth;
      return;
    }
    requestAnimationFrame(() => {
      // The panel may have closed (or the query cleared) before the frame ran.
      if (!this.isOpen || this.movedPanel !== panelEl) return;
      this.panelFloorPx = panelEl.offsetHeight;
      this.panelWidthPx = panelEl.offsetWidth;
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

  /** Whether a list entry is a {@link MnDropdownSeparator} rather than a command. */
  isSeparator(item: MnDropdownItem): item is MnDropdownSeparator {
    return (item as MnDropdownSeparator).separator;
  }

  /**
   * Narrows a list entry to a command, or null for a separator. Used as `@if (asAction(item);
   * as action)` in the template so the item loop gets a reliably-typed {@link MnDropdownAction}
   * without depending on template narrowing of the {@link isSeparator} guard.
   * @param item The list entry to narrow.
   * @returns The command, or null when the entry is a separator.
   */
  asAction(item: MnDropdownItem): MnDropdownAction | null {
    return this.isSeparator(item) ? null : item;
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
    const translated = this.datasource.ariaLabelKey ? this.lang.translateIfPresent(this.datasource.ariaLabelKey) : undefined;
    return translated ?? this.datasource.ariaLabel ?? this.uiConfig.ariaLabel ?? 'Actions';
  }

  /** The visible text on the trigger, or null for an icon-only ⋯ trigger. */
  get triggerLabelText(): string | null {
    const translated = this.datasource.triggerLabelKey ? this.lang.translateIfPresent(this.datasource.triggerLabelKey) : undefined;
    return translated ?? this.datasource.triggerLabel ?? null;
  }

  /**
   * The trigger's glyph, normalised to a single representation so the template renders it
   * one way — the same template-or-lucide-data path the menu items use — with no per-preset
   * switch. Resolves, in order: an explicit `'none'` (no glyph); a caller's custom template
   * or lucide data ({@link MnActionIcon}); otherwise a built-in preset mapped to its own
   * lucide data (a labelled trigger defaults to the chevron, an icon-only one to the dots).
   * @returns A template glyph, an icon-data glyph with its render size, or null for none.
   */
  private resolveTriggerGlyph():
    | { template: TemplateRef<unknown> }
    | { data: LucideIconData; size: number; dim: boolean }
    | null {
    const icon = this.datasource.triggerIcon;
    if (icon === 'none') return null;
    if (icon instanceof TemplateRef) return { template: icon };
    if (icon != null && typeof icon !== 'string') return { data: icon, size: 18, dim: false };
    const preset = typeof icon === 'string' ? icon : this.triggerLabelText ? 'chevron' : 'dots-vertical';
    // The chevron is a touch smaller and dimmed, matching a select's trailing affordance.
    return preset === 'chevron'
      ? { data: LucideChevronDown.icon, size: 16, dim: true }
      : { data: LucideEllipsisVertical.icon, size: 18, dim: false };
  }

  /** The trigger glyph when it is a caller's template, else null. Split from
   *  {@link triggerIconData} so the template narrows without a discriminated union. */
  get triggerIconTemplate(): TemplateRef<unknown> | null {
    const glyph = this.resolveTriggerGlyph();
    return glyph && 'template' in glyph ? glyph.template : null;
  }

  /** The trigger glyph when it is lucide data (a preset or caller data), with its render
   *  size and dim flag, else null. */
  get triggerIconData(): { data: LucideIconData; size: number; dim: boolean } | null {
    const glyph = this.resolveTriggerGlyph();
    return glyph && 'data' in glyph ? glyph : null;
  }

  /** Heading shown above the menu/sheet, or null when none is configured. */
  get menuLabel(): string | null {
    const translated = this.datasource.menuLabelKey ? this.lang.translateIfPresent(this.datasource.menuLabelKey) : undefined;
    return translated ?? this.datasource.menuLabel ?? this.uiConfig.menuLabel ?? null;
  }

  /** Accessible label for the sheet's close button. */
  get closeLabel(): string {
    return this.uiConfig.closeLabel ?? 'Close';
  }

  /** Placeholder shown in the search input, preferring a resolved translation key. */
  get searchPlaceholder(): string {
    const translated = this.datasource.searchPlaceholderKey ? this.lang.translateIfPresent(this.datasource.searchPlaceholderKey) : undefined;
    return translated ?? this.datasource.searchPlaceholder ?? this.uiConfig.searchPlaceholder ?? 'Search...';
  }

  /** Text shown in place of the list when the filter matches no actions. */
  get searchEmptyLabel(): string {
    const translated = this.datasource.searchEmptyLabelKey ? this.lang.translateIfPresent(this.datasource.searchEmptyLabelKey) : undefined;
    return translated ?? this.datasource.searchEmptyLabel ?? this.uiConfig.searchEmptyLabel ?? 'No results';
  }

  /** The ghost look the trigger has always used; a bare or partial `triggerButton` merges
   *  over this, so opting in without overriding anything keeps the current appearance. */
  private static readonly DEFAULT_TRIGGER_BUTTON: Partial<MnButtonTypes> = {
    size: 'sm',
    variant: 'text',
    color: 'gray',
  };

  /** mn-button config for the trigger: the ghost default, overlaid with any
   *  {@link MnDropdownProps.triggerButton} the caller supplied. */
  get triggerData(): Partial<MnButtonTypes> {
    return { ...MnDropdown.DEFAULT_TRIGGER_BUTTON, ...this.datasource.triggerButton };
  }

  get triggerClasses(): string {
    // Button mode: mn-button owns the entire look (fill/outline/size/radius/shape). The
    // trigger's square-box variants would fight that — `h-7 w-7` overrides its padding,
    // `text-base-content/80` its text colour — so keep only the label↔icon gap, which
    // mn-button's base does not provide.
    if (this.datasource.triggerButton) return 'gap-x-1.5';
    // A caller's template can be any size (an avatar, a badge) and sizes the trigger itself,
    // so skip the preset square-box — otherwise its `h-7 w-7` would clip the content, which
    // is why custom triggers used to need a `triggerButton` just to undo it. (A lucide-data
    // glyph is preset-sized, so it keeps the box for a consistent tap target.)
    if (this.datasource.triggerIcon instanceof TemplateRef) return 'gap-x-1.5';
    return mnDropdownTriggerVariants({
      size: this.datasource.size,
      borderRadius: this.datasource.borderRadius,
      labeled: !!this.triggerLabelText,
    });
  }

  get resolvedId(): string {
    return this.datasource.id ?? this.autoId;
  }
}
