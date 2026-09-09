import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {LucideChevronLeft, LucideChevronRight} from '@lucide/angular';
import {MnLanguageService, MnTranslatePipe} from '../../language';
import {MnBreadcrumbItem, MnBreadcrumbsData} from './mn-breadcrumbsTypes';
import {mnBreadcrumbsVariants} from './mn-breadcrumbsVariants';

/**
 * A flexible breadcrumb trail.
 *
 * Given crumbs it renders a linkable trail (`root › … › current`) where the last
 * crumb is the current page and is never a link. Given no crumbs it degrades to
 * a single "Back" control — the two are mutually exclusive. "Flexible" here is
 * input-driven, not viewport-driven: there is deliberately no responsive
 * collapse, no scroll machinery — it is a list of links plus a fallback.
 *
 * Navigation stays router- and history-agnostic where possible: a crumb (or the
 * Back control) with an `href` renders a plain `<a>` and navigates natively;
 * otherwise clicks emit outputs for the app to handle. Only the Back fallback
 * with no `href` reaches for `history.back()`.
 */
@Component({
  selector: 'mn-breadcrumbs',
  standalone: true,
  imports: [MnTranslatePipe, LucideChevronLeft, LucideChevronRight],
  templateUrl: './mn-breadcrumbs.html',
})
export class MnBreadcrumbs {
  /** Trail crumbs and Back-fallback configuration. */
  @Input() data: MnBreadcrumbsData = { items: [] };

  /** Emits the crumb that was clicked (non-current crumbs only). */
  @Output() crumbClick = new EventEmitter<MnBreadcrumbItem>();

  /** Emits when the fallback "Back" control is activated. */
  @Output() back = new EventEmitter<void>();

  /** Conventional key an app defines to translate the Back control's label. */
  private static readonly BACK_LABEL_KEY = 'mnBreadcrumbs.back';
  /** Conventional key an app defines to name the navigation landmark. */
  private static readonly NAV_LABEL_KEY = 'mnBreadcrumbs.label';
  /** Resolves this component's own labels against the app's bundle. */
  private readonly lang = inject(MnLanguageService);

  /** Resolved tailwind-variants slot functions for the current size. */
  get styles() {
    return mnBreadcrumbsVariants({ size: this.data.size });
  }

  /**
   * Accessible name of the `<nav>` landmark.
   *
   * A landmark's name is announced verbatim, so leaving it as a hardcoded English
   * "Breadcrumb" put one English word into every page of a translated app — in the
   * one place only screen-reader users hear.
   */
  get navLabel(): string {
    return this.lang.translateIfPresent(MnBreadcrumbs.NAV_LABEL_KEY) ?? 'Breadcrumb';
  }

  /** Whether a linkable trail should render (vs the Back fallback). */
  get hasTrail(): boolean {
    return (this.data.items?.length ?? 0) > 0;
  }

  /**
   * Text of the Back control, already translated.
   *
   * `data.backLabel` is a key (or a literal, which `translate` passes through
   * unchanged). Without one this falls back to the conventional key and then to
   * English — never to a raw key: the old default was the bare key `'back'`, which
   * the template's translate pipe echoed as lowercase "back" in every app that had
   * not happened to define it.
   */
  get backLabel(): string {
    if (this.data.backLabel) {
      return this.lang.translate(this.data.backLabel);
    }
    return this.lang.translateIfPresent(MnBreadcrumbs.BACK_LABEL_KEY) ?? 'Back';
  }

  /** The last crumb is the current page and is rendered as plain text. */
  isCurrent(index: number): boolean {
    return index === this.data.items.length - 1;
  }

  /** Runs a crumb's own callback and notifies listeners of the click. */
  onCrumb(item: MnBreadcrumbItem): void {
    item.onClick?.();
    this.crumbClick.emit(item);
  }

  /**
   * Fallback Back action. Always emits `back` for listeners; when no `backHref`
   * anchor is carrying the navigation, steps back through browser history.
   */
  onBack(): void {
    this.back.emit();
    if (!this.data.backHref) {
      window.history.back();
    }
  }
}
