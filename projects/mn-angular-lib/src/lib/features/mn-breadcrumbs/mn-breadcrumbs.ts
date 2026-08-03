import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { MnTranslatePipe } from '../../language';
import { MnBreadcrumbItem, MnBreadcrumbsData } from './mn-breadcrumbsTypes';
import { mnBreadcrumbsVariants } from './mn-breadcrumbsVariants';

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

  /** Default translation key / literal for the Back control's label. */
  private static readonly DEFAULT_BACK_LABEL = 'back';

  /** Resolved tailwind-variants slot functions for the current size. */
  get styles() {
    return mnBreadcrumbsVariants({ size: this.data.size });
  }

  /** Whether a linkable trail should render (vs the Back fallback). */
  get hasTrail(): boolean {
    return (this.data.items?.length ?? 0) > 0;
  }

  /** Label for the Back control — the configured key/literal, or the default. */
  get backLabel(): string {
    return this.data.backLabel ?? MnBreadcrumbs.DEFAULT_BACK_LABEL;
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
