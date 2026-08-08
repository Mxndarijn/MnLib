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
  ViewChild
} from '@angular/core';
import {NgClass, NgTemplateOutlet} from '@angular/common';
import {
  MnMultiSelectErrorMessageData,
  MnMultiSelectOption,
  MnMultiSelectProps,
  MnMultiSelectUIConfig
} from './mn-multi-selectTypes';
import {FormsModule, NgControl, ValidationErrors, Validators} from '@angular/forms';
import {mnMultiSelectVariants} from './mn-multi-selectVariants';
import {MnErrorMessage} from '../mn-error-message/mn-error-message';
import {MnButton} from '../mn-button';
import {MnInputField} from '../mn-input-field';
import {MnBottomSheet} from '../mn-bottom-sheet';
import {MnConfigService} from "../../config";
import {MN_INSTANCE_ID, MN_SECTION_PATH} from "../../context";
import {MnLanguageService} from "../../language";
import {skip} from "rxjs";
import {LucideChevronDown, LucideX} from "@lucide/angular";

export const MN_MULTI_SELECT_CONFIG = new InjectionToken<MnMultiSelectUIConfig>('MN_MULTI_SELECT_CONFIG');

@Component({
  selector: 'mn-lib-multi-select',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, FormsModule, MnErrorMessage, MnButton, MnInputField, MnBottomSheet, LucideX, LucideChevronDown],
  templateUrl: './mn-multi-select.html',
  styleUrl: './mn-multi-select.css',
})
export class MnMultiSelect implements OnInit {
  ngControl = inject(NgControl, {optional: true, self: true});

  protected uiConfig: MnMultiSelectUIConfig = {};

  @Input({ required: true }) props!: MnMultiSelectProps;

  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, { optional: true }) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, { optional: true });
  private readonly elRef = inject(ElementRef);
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly renderer = inject(Renderer2);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Reference to the trigger element for positioning the dropdown */
  @ViewChild('trigger', { static: false }) triggerRef!: ElementRef<HTMLElement>;
  /** Layout classes for the anchored popover panel. The mobile sheet is rendered by
   *  mn-bottom-sheet instead, so it no longer needs a branch here. */
  readonly panelClasses = 'fixed z-9999 bg-base-100 border border-base-300 rounded-md shadow-lg max-h-60 overflow-auto';
  /** Layout classes for the invisible click shield rendered under the anchored panel.
   *  One step below the panel's z-index so the panel itself stays clickable, and above
   *  any modal/drawer chrome (which tops out well under 9998). */
  readonly shieldClasses = 'fixed inset-0 z-9998';
  /** The anchored popover panel currently moved into `document.body`, if any. */
  private movedPanel: HTMLElement | null = null;
  /** The click shield currently moved into `document.body`, if any. */
  private movedShield: HTMLElement | null = null;

  /** Option count at which the search input auto-enables when `searchable` is unset. */
  private static readonly DEFAULT_SEARCH_THRESHOLD = 8;

  /** Tailwind's `sm` breakpoint — below this the panel renders as a bottom sheet.
   *  Kept in step with the same constant in `MnModalShellComponent`. */
  private static readonly SHEET_MAX_WIDTH = 639.98;

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
   * Watches the trigger while the panel is open. The panel lives in `document.body`,
   * so it survives its own trigger being hidden by an ancestor — e.g. a wizard step
   * or a tab that is switched away with `display: none` instead of being destroyed.
   * When the trigger stops being visible the panel must go with it.
   */
  private visibilityObserver: IntersectionObserver | null = null;

  /**
   * Capture-phase scroll listener installed while open. `window:scroll` only fires for
   * the document scroller, so scrolling an inner container (a modal body, a scrollable
   * card) used to leave the portalled panel floating at its stale coordinates.
   */
  private scrollCapture: ((event: Event) => void) | null = null;
  /** The bottom-sheet host currently moved into `document.body`, if any. */
  private movedSheet: HTMLElement | null = null;

  /**
   * The dropdown panel element, queried while it is rendered by the `@if` block.
   * The setter relocates the panel to `document.body` so that its `position: fixed`
   * coordinates resolve against the viewport rather than any transformed/filtered
   * ancestor (which would otherwise become the containing block and push the panel
   * to the middle of the screen — the root cause of the mis-positioning bug, also
   * broken on iOS). Cleanup is handled when the query clears on close/destroy.
   */
  @ViewChild('dropdown', {static: false})
  set dropdownRef(ref: ElementRef<HTMLElement> | undefined) {
    this.movedPanel = this.portal(ref?.nativeElement ?? null, this.movedPanel);
  }

  /**
   * The click shield sitting under the anchored panel, portalled alongside it for the same
   * reason: `position: fixed` must resolve against the viewport, not a transformed ancestor.
   */
  @ViewChild('shield', {static: false})
  set shieldRef(ref: ElementRef<HTMLElement> | undefined) {
    this.movedShield = this.portal(ref?.nativeElement ?? null, this.movedShield);
  }

  /** Currently selected values */
  selectedValues: unknown[] = [];
  isOpen = false;
  isDisabled = false;
  searchTerm = '';

  /** Dropdown position calculated from trigger bounding rect */
  dropdownStyle: { top: string; left: string; width: string } = { top: '0px', left: '0px', width: '0px' };

  private onChange: (val: unknown) => void = () => {
  };
  private onTouched: () => void = () => {};

  private readonly builtInErrorMessages: Record<string, MnMultiSelectErrorMessageData> = {
    required: 'At least one option must be selected',
  };

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  /**
   * The bottom-sheet host, read as an `ElementRef` so it can be relocated to
   * `document.body` — its `position: fixed` children (backdrop + container) must anchor
   * to the viewport, not to any transformed/filtered ancestor of this component. On open
   * its container height is captured as the sheet's `min-height` floor.
   */
  @ViewChild('sheet', {static: false, read: ElementRef})
  set sheetRef(ref: ElementRef<HTMLElement> | undefined) {
    const el = ref?.nativeElement ?? null;
    this.movedSheet = this.portal(el, this.movedSheet);
    if (el) {
      this.captureSheetFloor(el);
    } else {
      this.sheetFloorPx = null;
    }
  }

  /**
   * Tracks the sheet breakpoint through `matchMedia` rather than reading `innerWidth`
   * once, so rotating the device switches layout instead of leaving a panel positioned
   * for the previous orientation. An open panel is closed on the switch — its anchored
   * coordinates and its sheet layout are not interchangeable.
   */
  private startWatchingViewport(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    this.sheetMedia = window.matchMedia(`(max-width: ${MnMultiSelect.SHEET_MAX_WIDTH}px)`);
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

  ngOnInit() {
    this.resolveConfig();
    this.startWatchingViewport();

    const sub = this.lang.locale$.pipe(skip(1)).subscribe(() => {
      this.resolveConfig();
    });
    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      this.stopWatchingTrigger();
      this.stopWatchingViewport();
      this.unlockBodyScroll();
      // Guarantee the portalled elements never outlive the component.
      this.movedPanel = this.portal(null, this.movedPanel);
      this.movedShield = this.portal(null, this.movedShield);
      this.movedSheet = this.portal(null, this.movedSheet);
    });
  }

  private resolveConfig() {
    const instanceId = this.explicitInstanceId || `mn-multi-select-${this.props.id}`;
    this.uiConfig = this.configService.resolve<MnMultiSelectUIConfig>(
      'mn-multi-select',
      this.sectionPath,
      instanceId
    );

    if (this.props.label) {
      this.uiConfig = { ...this.uiConfig, label: this.props.label };
    }
    if (this.props.placeholder) {
      this.uiConfig = { ...this.uiConfig, placeholder: this.props.placeholder };
    }
  }

  // ========== ControlValueAccessor Implementation ==========

  writeValue(val: unknown): void {
    this.selectedValues = Array.isArray(val) ? val : [];
  }

  registerOnChange(fn: (val: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // ========== Dropdown Logic ==========

  toggle(): void {
    if (this.isDisabled) return;
    if (this.isOpen) {
      this.close();
      return;
    }
    this.isOpen = true;
    if (this.isSheet) {
      // A sheet is anchored to the viewport, so it needs no trigger tracking — only a
      // scroll lock so the page behind it stays put while the list is scrolled.
      this.lockBodyScroll();
      return;
    }
    this.updateDropdownPosition();
    this.startWatchingTrigger();
  }

  /** Whether the panel should currently render as a bottom sheet. */
  get isSheet(): boolean {
    return this.props.mobileSheet !== false && this.isNarrowViewport;
  }

  /**
   * Whether the search input is shown: the explicit `searchable` prop when set,
   * otherwise auto-enabled once the option count reaches the threshold.
   */
  get isSearchable(): boolean {
    if (this.props.searchable !== undefined) return this.props.searchable;
    const threshold = this.props.searchThreshold ?? MnMultiSelect.DEFAULT_SEARCH_THRESHOLD;
    return this.props.options.length >= threshold;
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
    // The panel lives at the body root once open, so it is not a descendant of the
    // host element — treat clicks inside the portalled panel as "inside" too.
    const insideHost = !!target && this.elRef.nativeElement.contains(target);
    const insidePanel = !!target && !!this.movedPanel && this.movedPanel.contains(target);
    // In sheet mode the backdrop tap is handled by mn-bottom-sheet's own (dismiss); the
    // sheet host counts as "inside" here so this listener never double-fires the close.
    const insideSheet = !!target && !!this.movedSheet && this.movedSheet.contains(target);
    if (!insideHost && !insidePanel && !insideSheet) {
      this.close();
    }
  }

  /**
   * Records the sheet's opened height as its `min-height` floor. Measured on the next
   * frame so the read reflects the fully-rendered, unfiltered list (the search box is
   * empty on open) and never forces a reflow mid change-detection. The floor equals the
   * content height at that instant, so applying it triggers no resize — it only stops a
   * later, shorter filtered list from pulling the sheet down.
   *
   * `hostEl` is the portalled mn-bottom-sheet host (`display: contents`), so the height
   * is read from its `.mn-sheet-container` child rather than the host itself.
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
      if (!this.isOpen || this.movedSheet !== hostEl) return;
      this.sheetFloorPx = measure();
      this.cdr.markForCheck();
    });
  }

  /** Closes the dropdown on Escape for keyboard accessibility. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  /**
   * Closes the dropdown when the page or a scrollable parent is scrolled.
   *
   * Skipped for a sheet: it is anchored to the viewport, not to the trigger, so it has
   * no stale position to escape. Crucially, opening the soft keyboard fires a `resize`
   * on Android — closing on that would dismiss the sheet the instant search is focused.
   * A genuine layout switch is handled by the `matchMedia` listener instead.
   */
  @HostListener('window:scroll', [])
  @HostListener('window:resize', [])
  onWindowScrollOrResize(): void {
    if (this.isSheet) return;
    this.close();
  }

  /**
   * The single close path. Every trigger (outside click, Escape, scroll, resize, the
   * trigger being hidden) funnels through here so the open-only listeners are always
   * torn down with the panel and never leak.
   */
  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.searchTerm = '';
    this.stopWatchingTrigger();
    this.unlockBodyScroll();
  }

  /**
   * Freezes the page behind an open sheet. The previous inline value is captured and
   * restored verbatim so a surrounding modal that set its own lock is left intact.
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

  /** Calculates the fixed position for the dropdown based on the trigger element */
  private updateDropdownPosition(): void {
    if (!this.triggerRef) return;
    const rect = this.triggerRef.nativeElement.getBoundingClientRect();
    this.dropdownStyle = {
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    };
  }

  /**
   * Starts the open-only watchers: an `IntersectionObserver` on the trigger (closes the
   * panel as soon as the trigger stops being rendered/visible) and a capture-phase
   * `scroll` listener (closes it when any ancestor scroller moves under it). Scrolls
   * that originate inside the panel's own option list are ignored.
   */
  private startWatchingTrigger(): void {
    this.stopWatchingTrigger();

    const trigger = this.triggerRef?.nativeElement;
    if (trigger && typeof IntersectionObserver !== 'undefined') {
      this.visibilityObserver = new IntersectionObserver(entries => {
        if (!entries.some(entry => !entry.isIntersecting)) return;
        this.close();
        // The observer fires outside Angular, so a zoneless app needs an explicit nudge.
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

  /**
   * Move an overlay element to `document.body` when it appears, and detach it when the
   * query clears. Appending to the body root makes the element immune to ancestor
   * `transform`/`filter`/`will-change`, so `position: fixed` anchors to the viewport —
   * without this the panel lands mid-screen (and breaks outright on iOS).
   *
   * Returns the element now portalled, so the caller can store it. Idempotent and safe
   * to call with `null`.
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

  /** Tears down the watchers installed by `startWatchingTrigger`. Idempotent. */
  private stopWatchingTrigger(): void {
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;
    if (this.scrollCapture) {
      document.removeEventListener('scroll', this.scrollCapture, true);
      this.scrollCapture = null;
    }
  }

  toggleOption(option: MnMultiSelectOption): void {
    if (option.disabled) return;

    const index = this.selectedValues.indexOf(option.value);
    if (index > -1) {
      this.selectedValues = this.selectedValues.filter(v => v !== option.value);
    } else {
      if (this.props.maxSelections && this.selectedValues.length >= this.props.maxSelections) {
        return;
      }
      this.selectedValues = [...this.selectedValues, option.value];
    }
    this.onChange(this.selectedValues);
  }

  removeOption(option: MnMultiSelectOption, event: Event): void {
    event.stopPropagation();
    this.selectedValues = this.selectedValues.filter(v => v !== option.value);
    this.onChange(this.selectedValues);
  }

  isSelected(option: MnMultiSelectOption): boolean {
    return this.selectedValues.includes(option.value);
  }

  isMaxReached(option: MnMultiSelectOption): boolean {
    if (!this.props.maxSelections) return false;
    return this.selectedValues.length >= this.props.maxSelections && !this.isSelected(option);
  }

  onSearch(term: string): void {
    this.searchTerm = term;
  }

  get filteredOptions(): MnMultiSelectOption[] {
    if (!this.searchTerm) return this.props.options;
    const lower = this.searchTerm.toLowerCase();
    return this.props.options.filter(o => o.label.toLowerCase().includes(lower));
  }

  get selectedOptions(): MnMultiSelectOption[] {
    return this.props.options.filter(o => this.selectedValues.includes(o.value));
  }

  // ========== Collapse Summary ==========

  /**
   * Whether the collapse-to-summary feature is opted into. Active when any of
   * `collapsePlaceholder`, `collapseThreshold` or `allSelectedPlaceholder` is
   * supplied; existing usages with none of them are unaffected.
   */
  get collapseEnabled(): boolean {
    return (
      this.props.collapsePlaceholder !== undefined ||
      this.props.collapseThreshold !== undefined ||
      this.props.allSelectedPlaceholder !== undefined
    );
  }

  /**
   * Whether every available option is currently selected. False for an empty select, where
   * "all of them" would be a claim about nothing.
   */
  get allSelected(): boolean {
    return this.props.options.length > 0 && this.selectedOptions.length === this.props.options.length;
  }

  /**
   * The threshold above which the trigger collapses. Defaults to 5 when collapsing
   * is enabled via `collapsePlaceholder` alone (no explicit `collapseThreshold`).
   */
  get effectiveCollapseThreshold(): number {
    return this.props.collapseThreshold ?? 5;
  }

  /**
   * Whether the trigger should currently render a summary instead of the individual
   * chips: when the number of selected options exceeds the effective threshold, or
   * when every option is selected and a summary for that case was supplied.
   */
  get isCollapsed(): boolean {
    if (!this.collapseEnabled) return false;
    // "Everything is selected" is worth saying at any count, so it collapses on its own rather
    // than waiting for the threshold a small option list would never reach.
    if (this.allSelected && this.props.allSelectedPlaceholder !== undefined) return true;
    return this.selectedOptions.length > this.effectiveCollapseThreshold;
  }

  /**
   * The summary text shown while collapsed, with the `{count}` token replaced by
   * the number of selected options. `allSelectedPlaceholder` wins while everything
   * is selected, then `collapsePlaceholder`, then `"{count} selected"`.
   */
  get collapseSummaryText(): string {
    const allSelectedTemplate = this.allSelected ? this.props.allSelectedPlaceholder : undefined;
    const template = allSelectedTemplate ?? this.props.collapsePlaceholder ?? '{count} selected';
    return template.replace(/\{count}/g, String(this.selectedOptions.length));
  }

  handleBlur(): void {
    this.onTouched();
  }

  // ========== Error Handling ==========

  get control() {
    return this.ngControl?.control ?? null;
  }

  get showError(): boolean {
    const c = this.control;
    return !!c && c.invalid && (c.touched || c.dirty);
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

  protected isRequired(): boolean {
    if (!this.control) return false;
    return this.control.hasValidator(Validators.required);
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
    // Interpolate {{placeholder}} tokens with validation error args
    if (errorArgs && typeof errorArgs === 'object') {
      return msgDef.replace(/\{\{(\w+)}}/g, (_, key) => errorArgs[key] ?? _);
    }
    return msgDef;
  }

  get errorMessages(): string[] {
    const errors = this.control?.errors;
    if (!errors) return [];
    return Object.keys(errors).map(key => this.resolveErrorMessageForKey(key, errors));
  }

  get errorMessage(): string | null {
    const errors = this.control?.errors;
    if (!errors) return null;
    const errorKey = this.pickErrorKey(errors);
    return this.resolveErrorMessageForKey(errorKey, errors);
  }

  // ========== Resolved Properties ==========

  get resolvedId(): string {
    return this.props.id;
  }

  get resolvedName(): string | null {
    return this.props?.name ?? null;
  }

  get triggerClasses(): string {
    return mnMultiSelectVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth,
    });
  }
}
