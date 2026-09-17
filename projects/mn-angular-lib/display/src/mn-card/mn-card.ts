import { Component, HostBinding, Input } from '@angular/core';
import { MnTranslatePipe } from 'mn-angular-lib/core';
import { MnIconChip } from './mn-icon-chip';
import { MnCardTypes } from './mn-cardTypes';
import { mnCardVariants } from './mn-cardVariants';

/**
 * The card: a rounded surface with a hairline border, a hover response and an
 * optional accent bar along its top edge. The body is whatever the consumer projects,
 * so a booking, a competition and a pending-action tile share one look without
 * sharing a view model.
 *
 * It is an attribute as well as an element, like `mnButton` and `mnBadge`: `<mn-card>`
 * for a plain surface, `<a mnCard [routerLink]>` for a card that is a link,
 * `<section mnCard>` when the landmark matters. Extra classes on the host merge with
 * the card's own, so sizing it (`min-w-0 flex-1`, `lg:w-80`) is ordinary CSS on the
 * element, not an input.
 *
 * A **section card** passes a {@link heading}: the card then renders the shared header
 * row, an {@link MnIconChip} beside an `h2`, then whatever trails the title (a badge, a
 * button). Project the icon with the `cardIcon` attribute and group the trailing content
 * in one `cardHeaderEnd` container, so the template reads icon, header end, body:
 *
 * ```html
 * <mn-card [data]="{ padding: 'md', color: 'primary' }" heading="meetings.agenda.title">
 *   <svg cardIcon lucideListOrdered [size]="20"></svg>
 *   <ng-container cardHeaderEnd>
 *     <span mnBadge [data]="{ size: 'sm', color: 'warning' }">Draft</span>
 *   </ng-container>
 *   ...body...
 * </mn-card>
 * ```
 *
 * The other members of the family build on this shell: {@link MnStatTile} for one
 * figure at a glance, and {@link MnProportionBar} for the bar inside a card.
 */
@Component({
  selector: 'mn-card, [mnCard]',
  standalone: true,
  imports: [MnIconChip, MnTranslatePipe],
  templateUrl: './mn-card.html',
})
export class MnCard {
  /** Padding, layout, hover, entrance, radius, colour and accent; see {@link MnCardTypes}. */
  @Input() data: Partial<MnCardTypes> = {};

  /**
   * Section title, as a translation key or a literal. When set, the header row with
   * the icon chip and `h2` renders above the body. Deliberately not called `title`: a
   * static `title="..."` on the host would also become a browser tooltip.
   */
  @Input() heading?: string;

  /**
   * Delay before the entrance animation starts, in milliseconds, so a row of cards
   * can rise one after another. Ignored when {@link MnCardTypes.enter} is `none`.
   */
  @Input() enterDelayMs = 0;

  /** Resolved slot classes for the current configuration. */
  get styles() {
    return mnCardVariants({
      padding: this.data.padding,
      layout: this.data.layout,
      hover: this.data.hover,
      enter: this.data.enter,
      borderRadius: this.data.borderRadius,
      color: this.data.color,
    });
  }

  /** The card element's own classes; the consumer's static classes merge with them. */
  @HostBinding('class')
  get hostClasses(): string {
    return this.styles.root();
  }

  /** Staggers the entrance per card. */
  @HostBinding('style.animation-delay')
  get animationDelay(): string {
    return `${this.enterDelayMs}ms`;
  }
}
