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
  ViewChild,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { LucideEllipsisVertical, LucideX } from '@lucide/angular';
import { skip } from 'rxjs';
import { MnButton } from '../mn-button';
import { MnBottomSheet } from '../mn-bottom-sheet';
import { MnConfigService } from '../../config';
import { MN_INSTANCE_ID, MN_SECTION_PATH } from '../../context';
import { MnLanguageService } from '../../language';
import { MnDropdownAction, MnDropdownProps, MnDropdownUIConfig } from './mn-dropdownTypes';
import { mnDropdownTriggerVariants } from './mn-dropdownVariants';

export const MN_DROPDOWN_CONFIG = new InjectionToken<MnDropdownUIConfig>('MN_DROPDOWN_CONFIG');

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
  imports: [NgClass, NgTemplateOutlet, MnButton, MnBottomSheet, LucideEllipsisVertical, LucideX],
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

  /** Layout classes for the anchored popover panel. The mobile sheet is rendered by
   *  mn-bottom-sheet instead, so it needs no branch here. */
  readonly panelClasses =
    'fixed z-9999 min-w-48 max-w-[min(20rem,90vw)] bg-base-100 border border-base-300 rounded-md shadow-lg py-1 max-h-[60vh] overflow-auto -translate-x-full';

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

  /** Watches the trigger while open, so the panel closes if the trigger is hidden. */
  private visibilityObserver: IntersectionObserver | null = null;
  /** Capture-phase scroll listener installed while open, closing on any ancestor scroll. */
  private scrollCapture: ((event: Event) => void) | null = null;

  isOpen = false;

  /** Popover position computed from the trigger's bounding rect. */
  dropdownStyle: { top: string; left: string } = { top: '0px', left: '0px' };

  /**
   * The popover panel, relocated to `document.body` on appearance (see mn-multi-select's
   * portal rationale) and detached when the query clears on close/destroy.
   */
  @ViewChild('dropdown', { static: false })
  set dropdownRef(ref: ElementRef<HTMLElement> | undefined) {
    this.movedPanel = this.portal(ref?.nativeElement ?? null, this.movedPanel);
  }

  /**
   * The bottom-sheet host, relocated to `document.body` so its `position: fixed`
   * children anchor to the viewport rather than a transformed ancestor.
   */
  @ViewChild('sheet', { static: false, read: ElementRef })
  set sheetRef(ref: ElementRef<HTMLElement> | undefined) {
    this.movedSheet = this.portal(ref?.nativeElement ?? null, this.movedSheet);
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

  /** Accessible name for the ⋯ trigger button. */
  get triggerAriaLabel(): string {
    const translated = this.props.ariaLabelKey ? this.lang.translateIfPresent(this.props.ariaLabelKey) : undefined;
    return translated ?? this.props.ariaLabel ?? this.uiConfig.ariaLabel ?? 'Actions';
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

  get triggerClasses(): string {
    return mnDropdownTriggerVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
    });
  }

  get resolvedId(): string {
    return this.props.id;
  }
}
