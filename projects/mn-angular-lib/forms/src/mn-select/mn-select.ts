import { anchoredPanelPlacement } from '../shared/anchored-panel-placement';
import { scrollOptionIntoView, stepEnabledIndex } from '../shared/listbox-navigation';
import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  InjectionToken,
  Injector,
  Input,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  MnSelectErrorMessageData,
  MnSelectOption,
  MnSelectProps,
  MnSelectUIConfig,
} from './mn-selectTypes';
import { FormsModule, NgControl, ValidationErrors, Validators } from '@angular/forms';
import { mnSelectVariants } from './mn-selectVariants';
import { MnErrorMessage } from '../mn-error-message/mn-error-message';
import { MnInputField } from '../mn-input-field';
import { MnBottomSheet } from 'mn-angular-lib/bottom-sheet';
import { MnConfigService } from 'mn-angular-lib/core';
import { MN_INSTANCE_ID, MN_SECTION_PATH } from 'mn-angular-lib/core';
import { MnLanguageService } from 'mn-angular-lib/core';
import { skip } from 'rxjs';
import { LucideDynamicIcon } from '@lucide/angular';
import * as lucide from 'lucide';
import { lucideIcons } from 'mn-angular-lib/core';

/** Lucide icons this file renders. */
const ICONS = lucideIcons({ Check: lucide.Check, ChevronDown: lucide.ChevronDown });

export const MN_SELECT_CONFIG = new InjectionToken<MnSelectUIConfig>('MN_SELECT_CONFIG');

/** The keys that open a closed select from its trigger. */
const OPEN_KEYS = ['ArrowDown', 'ArrowUp', 'Enter', ' '];

/**
 * Whether the keyboard may highlight an option.
 * @param option - The option.
 * @returns False for a disabled option.
 */
function isChoosable(option: MnSelectOption): boolean {
  return !option.disabled;
}

/**
 * Takes a key for the select: no default action (no scroll, no form submit) and no bubbling to a
 * surrounding modal's own Enter or Escape handling.
 * @param event - The keydown to claim.
 */
function claim(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * A single-value picker. The trigger opens a `role="listbox"` of {@link MnSelectOption}s;
 * choosing one sets the value and closes — this is the value-picker twin of the ⋯
 * command menu mn-dropdown, so it *is* a ControlValueAccessor.
 *
 * Presentation mirrors mn-multi-select: one custom field trigger at every size, an
 * anchored popover on desktop and the shared {@link MnBottomSheet} on mobile (< 640px) —
 * the same sheet mn-dropdown itself wraps. Both the popover and the sheet host are
 * portalled to `document.body` so their `position: fixed` anchors to the viewport rather
 * than any transformed/filtered ancestor (a table cell, a card) — the same root-cause fix
 * the multi-select applies.
 */
@Component({
  selector: 'mn-lib-select',
  standalone: true,
  imports: [
    NgClass,
    NgTemplateOutlet,
    FormsModule,
    MnErrorMessage,
    MnInputField,
    MnBottomSheet,
    LucideDynamicIcon,
  ],
  templateUrl: './mn-select.html',
  host: {
    // Without an explicit host width the inline host collapses to its content size, so
    // the trigger's `w-full` (width:100%) resolves against a content-sized box and fails
    // to fill the parent. Give the host a real width when fullWidth is requested.
    '[style.display]': "props?.fullWidth ? 'block' : null",
    '[style.width]': "props?.fullWidth ? '100%' : null",
  },
})
export class MnSelect implements OnInit {
  /** Lucide icons the template renders. */
  protected readonly icons = ICONS;

  ngControl = inject(NgControl, { optional: true, self: true });

  @Input({ required: true }) props!: MnSelectProps;

  /** Currently selected value */
  selectedValue: unknown = null;
  isOpen = false;
  isDisabled = false;
  searchTerm = '';

  /**
   * Position in `filteredOptions` of the option the keyboard is on, or -1 for none. Reset when the
   * list it indexes changes (a search) or goes away (close), so it never points at a stale row.
   */
  activeIndex = -1;

  protected uiConfig: MnSelectUIConfig = {};

  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, { optional: true }) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, { optional: true });
  private readonly elRef = inject(ElementRef);
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly renderer = inject(Renderer2);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly injector = inject(Injector);

  /** Lucide data for the trailing check shown on the selected row. */
  protected readonly checkIcon = ICONS.Check;

  /** Reference to the trigger element for positioning the dropdown. */
  @ViewChild('trigger', { static: false }) triggerRef!: ElementRef<HTMLElement>;

  /** Layout classes for the anchored popover panel. The mobile sheet is rendered by
   *  mn-bottom-sheet instead, so it no longer needs a branch here. */
  readonly panelClasses =
    'fixed z-9999 w-max bg-base-100 border border-base-300 rounded-md shadow-lg max-h-60 overflow-auto';

  /** The panel's own height cap in pixels: the `max-h-60` above, restated for the placement maths. */
  static readonly PANEL_MAX_HEIGHT_PX = 240;
  /** Space kept between a widened panel and the viewport's right edge. */
  static readonly PANEL_EDGE_GAP_PX = 8;
  /** Layout classes for the invisible click shield rendered under the anchored panel.
   *  One step below the panel's z-index so the panel itself stays clickable, and above
   *  any modal/drawer chrome (which tops out well under 9998). */
  readonly shieldClasses = 'fixed inset-0 z-9998';

  /** Option count at which the search input auto-enables when `searchable` is unset. */
  private static readonly DEFAULT_SEARCH_THRESHOLD = 8;

  /** Tailwind's `sm` breakpoint — below this the panel renders as a bottom sheet.
   *  Kept in step with the same constant in mn-bottom-sheet / mn-multi-select. */
  private static readonly SHEET_MAX_WIDTH = 639.98;

  /** The anchored popover panel currently moved into `document.body`, if any. */
  private movedPanel: HTMLElement | null = null;
  /** The click shield currently moved into `document.body`, if any. */
  private movedShield: HTMLElement | null = null;
  /** The bottom-sheet host, for outside-click tests. The sheet owns its own placement. */
  private sheetHost: HTMLElement | null = null;

  /** Whether the viewport is currently narrow enough for the sheet layout. */
  private isNarrowViewport = false;
  /** Live breakpoint match, so rotating the device re-evaluates the layout. */
  private sheetMedia: MediaQueryList | null = null;
  /** The listener registered on `sheetMedia`, retained for teardown. */
  private sheetMediaListener: ((event: MediaQueryListEvent) => void) | null = null;

  /** `document.body`'s inline `overflow` before the sheet locked it, restored on close. */
  private previousBodyOverflow: string | null = null;

  /**
   * The sheet's height (px) captured the moment it opened, before any search. Re-applied
   * as a `min-height` floor so filtering the option list shorter cannot shrink the sheet
   * mid-type. Null while anchored or closed, so the popover and desktop path are untouched.
   */
  sheetFloorPx: number | null = null;

  /**
   * Watches the trigger while the panel is open. The panel lives in `document.body`, so it
   * survives its own trigger being hidden by an ancestor — a wizard step or a tab switched
   * away with `display: none`. When the trigger stops being visible the panel goes with it.
   */
  private visibilityObserver: IntersectionObserver | null = null;

  /**
   * Capture-phase scroll listener installed while open. `window:scroll` only fires for the
   * document scroller, so scrolling an inner container (a modal body, a scrollable card)
   * would otherwise leave the portalled panel floating at its stale coordinates.
   */
  private scrollCapture: ((event: Event) => void) | null = null;

  /** Dropdown position calculated from the trigger's bounding rect. */
  /** Inline placement of the anchored panel; `maxHeight` only binds when the viewport is the tighter cap. */
  dropdownStyle: {
    top: string;
    bottom: string;
    left: string;
    minWidth: string;
    maxWidth: string;
    maxHeight: string | null;
  } = {
    top: '0px',
    bottom: 'auto',
    left: '0px',
    minWidth: '0px',
    maxWidth: 'none',
    maxHeight: null,
  };

  private onChange: (val: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  private readonly builtInErrorMessages: Record<string, MnSelectErrorMessageData> = {
    required: 'Please select an option',
  };

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  /**
   * The dropdown panel element, queried while it is rendered by the `@if` block. The setter
   * relocates the panel to `document.body` so that its `position: fixed` coordinates resolve
   * against the viewport rather than any transformed/filtered ancestor (which would otherwise
   * become the containing block and push the panel to the middle of the screen — also broken
   * on iOS). Cleanup is handled when the query clears on close/destroy.
   */
  @ViewChild('dropdown', { static: false })
  set dropdownRef(ref: ElementRef<HTMLElement> | undefined) {
    this.movedPanel = this.portal(ref?.nativeElement ?? null, this.movedPanel);
  }

  /**
   * The click shield sitting under the anchored panel, portalled alongside it for the same
   * reason: `position: fixed` must resolve against the viewport, not a transformed ancestor.
   */
  @ViewChild('shield', { static: false })
  set shieldRef(ref: ElementRef<HTMLElement> | undefined) {
    this.movedShield = this.portal(ref?.nativeElement ?? null, this.movedShield);
  }

  /**
   * The bottom-sheet host, kept as a reference for outside-click tests. The sheet relocates
   * itself to `document.body`, so nothing is moved here. On open its container height is
   * captured as the sheet's `min-height` floor.
   */
  @ViewChild('sheet', { static: false, read: ElementRef })
  set sheetRef(ref: ElementRef<HTMLElement> | undefined) {
    const el = ref?.nativeElement ?? null;
    this.sheetHost = el;
    if (el) {
      this.captureSheetFloor(el);
    } else {
      this.sheetFloorPx = null;
    }
  }

  get control() {
    return this.ngControl?.control ?? null;
  }

  get selectedOption(): MnSelectOption | undefined {
    return this.props.options.find((o) => o.value === this.selectedValue);
  }

  /** The label shown in the trigger: the selected option, else the placeholder. */
  get displayText(): string {
    return this.selectedOption?.label ?? this.placeholderLabel;
  }

  /** Trigger text shown while no option is selected. */
  get placeholderLabel(): string {
    return this.resolveLabel(
      this.props.placeholder,
      'mnSelect.placeholder',
      'Select...',
      this.uiConfig.placeholder,
    );
  }

  /** Placeholder and accessible name of the dropdown's search input. */
  get searchPlaceholderLabel(): string {
    return this.resolveLabel(
      this.props.searchPlaceholder,
      'mnSelect.search',
      'Search...',
      this.uiConfig.searchPlaceholder,
    );
  }

  /** Empty text shown when the search filters every option away. */
  get noOptionsLabel(): string {
    return this.resolveLabel(
      undefined,
      'mnSelect.noOptions',
      'No options found',
      this.uiConfig.noOptionsFound,
    );
  }

  /**
   * Resolves one of the component's own labels, preferring what the caller gave it
   * and falling back through the config layer, a conventional translation key and
   * finally a readable English default.
   *
   * Mirrors `MnCollectionBase.resolveLabel` and its twin in `MnMultiSelect`. Without
   * the key step a consumer could only translate these by repeating the same literal
   * at every call site, and the search box in particular auto-enables on option
   * count — it appears without anyone asking for it, so it must be translatable
   * without anyone asking either.
   *
   * @param explicit The label the caller passed through `props`, if any.
   * @param key The conventional translation key to try next.
   * @param fallback The English text used when neither resolves.
   * @param configured The value the config layer resolved, if any.
   * @returns The resolved label.
   */
  private resolveLabel(
    explicit: string | undefined,
    key: string,
    fallback: string,
    configured?: string,
  ): string {
    return explicit ?? configured ?? this.lang.translateIfPresent(key) ?? fallback;
  }

  get showError(): boolean {
    const c = this.control;
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  get errorMessages(): string[] {
    const errors = this.control?.errors;
    if (!errors) return [];
    return Object.keys(errors).map((key) => this.resolveErrorMessageForKey(key, errors));
  }

  get errorMessage(): string | null {
    const errors = this.control?.errors;
    if (!errors) return null;
    const errorKey = this.pickErrorKey(errors);
    return this.resolveErrorMessageForKey(errorKey, errors);
  }

  get resolvedId(): string {
    return this.props.id;
  }

  get resolvedName(): string | null {
    return this.props?.name ?? null;
  }

  get triggerClasses(): string {
    return mnSelectVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth,
    });
  }

  /** Whether the panel should currently render as a bottom sheet. */
  get isSheet(): boolean {
    return this.props.mobileSheet !== false && this.isNarrowViewport;
  }

  /**
   * Whether the search input is shown: the explicit `searchable` prop when set, otherwise
   * auto-enabled once the option count reaches the threshold.
   */
  get isSearchable(): boolean {
    if (this.props.searchable !== undefined) return this.props.searchable;
    const threshold = this.props.searchThreshold ?? MnSelect.DEFAULT_SEARCH_THRESHOLD;
    return this.props.options.length >= threshold;
  }

  get filteredOptions(): MnSelectOption[] {
    if (!this.searchTerm) return this.props.options;
    const lower = this.searchTerm.toLowerCase();
    return this.props.options.filter((o) => o.label.toLowerCase().includes(lower));
  }

  // ========== Lifecycle ==========

  ngOnInit() {
    this.resolveConfig();
    this.startWatchingViewport();

    const sub = this.lang.locale$.pipe(skip(1)).subscribe(() => {
      this.resolveConfig();
      // `resolveConfig` rewrites plain fields the template reads; under OnPush nothing else
      // marks this view for the locale change.
      this.cdr.markForCheck();
    });
    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      this.stopWatchingTrigger();
      this.stopWatchingViewport();
      this.unlockBodyScroll();
      // Guarantee the portalled elements never outlive the component.
      this.movedPanel = this.portal(null, this.movedPanel);
      this.movedShield = this.portal(null, this.movedShield);
      this.sheetHost = null;
    });
  }

  // ========== ControlValueAccessor Implementation ==========

  writeValue(val: unknown): void {
    // Treat empty string as null so the placeholder is shown and the control stays properly invalid.
    this.selectedValue = val === '' || val == null ? null : val;
    // The forms API writes in from outside (setValue, reset, patch); nothing marks
    // this view for it.
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (val: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    // `control.disable()` / `.enable()` reaches us the same way `writeValue` does —
    // from the forms API, with no event behind it.
    this.cdr.markForCheck();
  }

  // ========== Dropdown Logic ==========

  toggle(): void {
    if (this.isDisabled) return;
    if (this.isOpen) {
      this.close();
      return;
    }
    // `toggle()` and `close()` are public API: a consumer holding a @ViewChild can
    // open the panel without an event, and under OnPush nothing else marks this view.
    this.isOpen = true;
    this.cdr.markForCheck();
    if (this.isSheet) {
      // A sheet is anchored to the viewport, so it needs no trigger tracking — only a
      // scroll lock so the page behind it stays put while the list is scrolled.
      this.lockBodyScroll();
      return;
    }
    this.updateDropdownPosition();
    this.startWatchingTrigger();
  }

  /** Selects an option, notifies the form and closes — a single choice ends the interaction. */
  selectOption(option: MnSelectOption): void {
    if (option.disabled) return;
    this.selectedValue = option.value;
    this.onChange(this.selectedValue);
    this.close();
  }

  isSelected(option: MnSelectOption): boolean {
    return this.selectedValue === option.value;
  }

  /** Filters the options; the first match is highlighted so Enter picks it, none once the box is cleared. */
  onSearch(term: string | null): void {
    this.searchTerm = term ?? '';
    this.activeIndex = this.searchTerm
      ? stepEnabledIndex(this.filteredOptions, -1, 1, isChoosable)
      : -1;
  }

  /** Id of the keyboard-highlighted option, for `aria-activedescendant`; null when none is. */
  get activeOptionId(): string | null {
    const inRange = this.activeIndex >= 0 && this.activeIndex < this.filteredOptions.length;
    return this.isOpen && inRange ? this.optionId(this.activeIndex) : null;
  }

  /**
   * The DOM id of the option rendered at a position in `filteredOptions`.
   * @param index - The option's position.
   * @returns The id, unique per select.
   */
  optionId(index: number): string {
    return `${this.resolvedId}-option-${index}`;
  }

  /**
   * Keyboard handling for the trigger and the search box, the WAI-ARIA combobox pattern. While
   * closed, ArrowDown, ArrowUp, Enter and Space open the list with an option highlighted. While
   * open, the arrows move the highlight past disabled options without wrapping, Home and End jump
   * to the ends, Enter (and Space outside the search box) chooses the highlighted option and returns focus to the trigger, Escape closes and Tab closes and lets focus move on. Enter and Space
   * stop here, so they can never submit a surrounding form or close a surrounding modal.
   * @param event - The keydown.
   * @param fromSearch - True when it came from the search box, where Space, Home and End edit text.
   */
  onKeydown(event: KeyboardEvent, fromSearch = false): void {
    if (this.isDisabled) return;
    // Only keys pressed on the trigger itself; nothing inside it is focusable today, but stay safe.
    if (!fromSearch && event.target !== event.currentTarget) return;

    if (!this.isOpen) {
      if (fromSearch || !OPEN_KEYS.includes(event.key)) return;
      claim(event);
      this.toggle();
      const selected = this.filteredOptions.findIndex((o) => this.isSelected(o) && isChoosable(o));
      this.activeIndex =
        selected >= 0
          ? selected
          : stepEnabledIndex(
              this.filteredOptions,
              -1,
              event.key === 'ArrowUp' ? -1 : 1,
              isChoosable,
            );
      this.revealActiveOption();
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        claim(event);
        this.moveActive(this.activeIndex, event.key === 'ArrowDown' ? 1 : -1);
        return;
      case 'Home':
      case 'End':
        if (fromSearch) return;
        claim(event);
        this.moveActive(-1, event.key === 'Home' ? 1 : -1);
        return;
      case ' ':
        if (fromSearch) return;
        this.chooseActive(event);
        return;
      case 'Enter':
        this.chooseActive(event);
        return;
      case 'Escape':
        claim(event);
        this.close();
        this.focusTrigger();
        return;
      case 'Tab':
        // Focus moves on from the trigger, so the search box's Tab order position never matters.
        this.close();
        this.focusTrigger();
        return;
    }
  }

  /**
   * Moves the highlight one enabled option from `from` and scrolls it into view.
   * @param from - Where to step from; -1 to start at an end.
   * @param step - 1 for down, -1 for up.
   */
  private moveActive(from: number, step: 1 | -1): void {
    this.activeIndex = stepEnabledIndex(this.filteredOptions, from, step, isChoosable);
    this.revealActiveOption();
  }

  /**
   * Chooses the highlighted option (or just closes when none is) and hands focus back to the trigger,
   * because the search box that may hold it is removed with the panel.
   * @param event - The Enter or Space keydown, claimed so a form around the select is not submitted.
   */
  private chooseActive(event: KeyboardEvent): void {
    claim(event);
    const option = this.filteredOptions[this.activeIndex];
    if (option) {
      this.selectOption(option);
    } else {
      this.close();
    }
    this.focusTrigger();
  }

  /** Scrolls the highlighted option into view once the render that paints its ring has run. */
  private revealActiveOption(): void {
    afterNextRender(
      () => {
        const id = this.activeOptionId;
        scrollOptionIntoView(id ? document.getElementById(id) : null);
      },
      { injector: this.injector },
    );
  }

  /** Puts focus back on the trigger. */
  private focusTrigger(): void {
    this.triggerRef?.nativeElement.focus();
  }

  /**
   * The single close path. Every trigger (outside click, Escape, scroll, resize, the trigger
   * being hidden, a choice) funnels through here so the open-only listeners are always torn
   * down with the panel and never leak.
   */
  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.cdr.markForCheck();
    this.searchTerm = '';
    this.activeIndex = -1;
    this.stopWatchingTrigger();
    this.unlockBodyScroll();
  }

  handleBlur(): void {
    this.onTouched();
  }

  /**
   * Dismisses the anchored panel from a shield click, and stops the event there.
   *
   * Swallowing it is the point: the shield spans the viewport, so the click would otherwise
   * land on whatever the panel was floating over. Inside a modal that is the modal's own
   * backdrop, and "close the dropdown" would double as "throw away the modal". A first click
   * that only dismisses the overlay is also how native selects and menus behave.
   */
  onShieldClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as Node | null;
    // The panel lives at the body root once open, so it is not a descendant of the host
    // element — treat clicks inside the portalled panel as "inside" too.
    const insideHost = !!target && this.elRef.nativeElement.contains(target);
    const insidePanel = !!target && !!this.movedPanel && this.movedPanel.contains(target);
    // In sheet mode the backdrop tap is handled by mn-bottom-sheet's own (dismiss); the
    // sheet host counts as "inside" here so this listener never double-fires the close.
    const insideSheet = !!target && !!this.sheetHost && this.sheetHost.contains(target);
    if (!insideHost && !insidePanel && !insideSheet) {
      this.close();
    }
  }

  /** Closes the dropdown on Escape for keyboard accessibility. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  /**
   * Closes the dropdown when the page or a scrollable parent is scrolled.
   *
   * Skipped for a sheet: it is anchored to the viewport, not to the trigger, so it has no
   * stale position to escape. Crucially, opening the soft keyboard fires a `resize` on
   * Android — closing on that would dismiss the sheet the instant search is focused. A
   * genuine layout switch is handled by the `matchMedia` listener instead.
   */
  @HostListener('window:scroll', [])
  @HostListener('window:resize', [])
  onWindowScrollOrResize(): void {
    if (this.isSheet) return;
    this.close();
  }

  protected isRequired(): boolean {
    if (!this.control) return false;
    return this.control.hasValidator(Validators.required);
  }

  // ========== Viewport / breakpoint watching ==========

  /**
   * Tracks the sheet breakpoint through `matchMedia` rather than reading `innerWidth` once,
   * so rotating the device switches layout instead of leaving a panel positioned for the
   * previous orientation. An open panel is closed on the switch — its anchored coordinates
   * and its sheet layout are not interchangeable.
   */
  private startWatchingViewport(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    this.sheetMedia = window.matchMedia(`(max-width: ${MnSelect.SHEET_MAX_WIDTH}px)`);
    this.isNarrowViewport = this.sheetMedia.matches;

    this.sheetMediaListener = (event: MediaQueryListEvent) => {
      this.isNarrowViewport = event.matches;
      this.close();
      // The listener fires outside Angular, so a zoneless app needs an explicit nudge.
      this.cdr.markForCheck();
    };
    this.sheetMedia.addEventListener('change', this.sheetMediaListener);
  }

  /** Tears down the breakpoint listener. Idempotent. */
  private stopWatchingViewport(): void {
    if (this.sheetMedia && this.sheetMediaListener) {
      this.sheetMedia.removeEventListener('change', this.sheetMediaListener);
    }
    this.sheetMedia = null;
    this.sheetMediaListener = null;
  }

  // ========== Body scroll lock (sheet only) ==========

  /**
   * Freezes the page behind an open sheet. The previous inline value is captured and restored
   * verbatim so a surrounding modal that set its own lock is left intact.
   */
  private lockBodyScroll(): void {
    if (this.previousBodyOverflow !== null) return;
    this.previousBodyOverflow = document.body.style.overflow;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
  }

  /** Restores the pre-lock `overflow`. Idempotent. */
  private unlockBodyScroll(): void {
    if (this.previousBodyOverflow === null) return;
    if (this.previousBodyOverflow) {
      this.renderer.setStyle(document.body, 'overflow', this.previousBodyOverflow);
    } else {
      this.renderer.removeStyle(document.body, 'overflow');
    }
    this.previousBodyOverflow = null;
  }

  // ========== Positioning ==========

  /**
   * Calculates the fixed position for the dropdown based on the trigger element: below it
   * while the viewport has room, above it otherwise, never past the viewport's edge.
   * The panel is never narrower than the trigger but grows to its widest option, so a compact
   * trigger (the collection page-size picker) cannot squeeze the selected row's check mark
   * over its label. It stops at the viewport's right edge, where long labels truncate.
   */
  private updateDropdownPosition(): void {
    if (!this.triggerRef) return;
    const rect = this.triggerRef.nativeElement.getBoundingClientRect();
    const roomToRightEdge = window.innerWidth - rect.left - MnSelect.PANEL_EDGE_GAP_PX;
    this.dropdownStyle = {
      ...anchoredPanelPlacement(rect, window.innerHeight, 0, MnSelect.PANEL_MAX_HEIGHT_PX),
      left: `${rect.left}px`,
      minWidth: `${rect.width}px`,
      maxWidth: `${Math.max(rect.width, roomToRightEdge)}px`,
    };
  }

  /**
   * Starts the open-only watchers: an `IntersectionObserver` on the trigger (closes the panel
   * as soon as the trigger stops being rendered/visible) and a capture-phase `scroll` listener
   * (closes it when any ancestor scroller moves under it). Scrolls that originate inside the
   * panel's own option list are ignored.
   */
  private startWatchingTrigger(): void {
    this.stopWatchingTrigger();

    const trigger = this.triggerRef?.nativeElement;
    if (trigger && typeof IntersectionObserver !== 'undefined') {
      this.visibilityObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => !entry.isIntersecting)) return;
        this.close();
        // The observer fires outside Angular, so a zoneless app needs an explicit nudge.
        this.cdr.markForCheck();
      });
      this.visibilityObserver.observe(trigger);
    }

    this.scrollCapture = (event: Event) => {
      const target = event.target as Node | null;
      if (
        target &&
        this.movedPanel &&
        (this.movedPanel === target || this.movedPanel.contains(target))
      ) {
        return;
      }
      this.close();
      this.cdr.markForCheck();
    };
    document.addEventListener('scroll', this.scrollCapture, true);
  }

  /** Tears down the watchers installed by `startWatchingTrigger`. Idempotent. */
  private stopWatchingTrigger(): void {
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;
    if (this.scrollCapture) {
      document.removeEventListener('scroll', this.scrollCapture, true);
      this.scrollCapture = null;
    }
  }

  // ========== Sheet height floor ==========

  /**
   * Records the sheet's opened height as its `min-height` floor. Measured on the next frame
   * so the read reflects the fully-rendered, unfiltered list (the search box is empty on
   * open) and never forces a reflow mid change-detection. The floor equals the content height
   * at that instant, so applying it triggers no resize — it only stops a later, shorter
   * filtered list from pulling the sheet down.
   *
   * `hostEl` is the portalled mn-bottom-sheet host (`display: contents`), so the height is
   * read from its `.mn-sheet-container` child rather than the host itself.
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
      // The sheet may have closed before the frame ran; don't strand a stale floor.
      if (!this.isOpen || this.sheetHost !== hostEl) return;
      this.sheetFloorPx = measure();
      this.cdr.markForCheck();
    });
  }

  // ========== Portal helper (see mn-multi-select for the full rationale) ==========

  /**
   * Move an overlay element to `document.body` when it appears, and detach it when the query
   * clears. Appending to the body root makes the element immune to ancestor
   * `transform`/`filter`/`will-change`, so `position: fixed` anchors to the viewport — without
   * this the panel lands mid-screen (and breaks outright on iOS).
   *
   * Returns the element now portalled, so the caller can store it. Idempotent and safe to
   * call with `null`.
   */
  private portal(el: HTMLElement | null, current: HTMLElement | null): HTMLElement | null {
    if (el) {
      if (current === el) return current;
      this.renderer.appendChild(document.body, el);
      return el;
    }
    if (current) {
      // Angular's view teardown may already have removed it; only detach if still attached.
      const parent = current.parentNode;
      if (parent) {
        this.renderer.removeChild(parent, current);
      }
    }
    return null;
  }

  // ========== Config / Error Handling ==========

  private resolveConfig() {
    const instanceId = this.explicitInstanceId || `mn-select-${this.props.id}`;
    this.uiConfig = this.configService.resolve<MnSelectUIConfig>(
      'mn-select',
      this.sectionPath,
      instanceId,
    );

    if (this.props.label) {
      this.uiConfig = { ...this.uiConfig, label: this.props.label };
    }
    if (this.props.placeholder) {
      this.uiConfig = { ...this.uiConfig, placeholder: this.props.placeholder };
    }
    if (this.props.ariaLabel) {
      this.uiConfig = { ...this.uiConfig, ariaLabel: this.props.ariaLabel };
    }
  }

  private pickErrorKey(errors: ValidationErrors): string {
    if (this.props.errorPriority) {
      for (const key of this.props.errorPriority) {
        if (errors[key] !== undefined) {
          return key;
        }
      }
    }
    return Object.keys(errors)[0];
  }

  private resolveErrorMessageForKey(errorKey: string, errors: ValidationErrors): string {
    const errorArgs = errors[errorKey];
    const customMsg = this.props.errorMessages?.[errorKey];
    const configMsg = this.uiConfig.errorMessages?.[errorKey];
    const useBuiltIn = this.props.useBuiltInErrorMessages !== false;
    const builtInMsg = useBuiltIn ? this.builtInErrorMessages[errorKey] : undefined;
    const fallbackMsg = this.props.defaultErrorMessage;
    const msgDef = customMsg ?? configMsg ?? builtInMsg ?? fallbackMsg ?? 'Invalid input';

    if (typeof msgDef === 'function') {
      return msgDef(errorArgs, errors);
    }
    if (errorArgs && typeof errorArgs === 'object') {
      return msgDef.replace(/{{(\w+)}}/g, (_, key) => errorArgs[key] ?? _);
    }
    return msgDef;
  }
}
