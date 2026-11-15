import { Component, computed, ElementRef, output, signal, viewChild } from '@angular/core';
import { MnButton, MnButtonTypes } from 'mn-angular-lib/button';
import { MnTourBox, MnTourSize } from './mn-tour-geometry';
import { MnTourNextTour } from './mn-tour.types';

/**
 * How the card is placed:
 * - `beside`: next to the highlighted target (desktop);
 * - `centred`: in the middle of the viewport (welcome and final cards, centred offers);
 * - `corner`: bottom-right, for an offer that leaves the page usable;
 * - `sheet`: a bottom sheet, below the `lg` breakpoint.
 */
export type MnTourCardVariant = 'beside' | 'centred' | 'corner' | 'sheet';

/** Which dim is on screen: none, the whole page, or everything around the highlight. */
export type MnTourDim = 'none' | 'full' | 'hole';

/** A button or link on the card the user pressed. The service decides what it means. */
export type MnTourCardAction = 'skip' | 'secondary' | 'primary' | 'link';

/** What the card shows. Every string is the caller's, already translated. */
export type MnTourCardView = {
  /** Small line above the title. */
  kicker?: string;
  /** The title; the card's accessible name. */
  title: string;
  /** The body; the card's accessible description. */
  body: string;
  /** Optional "next tour" block above the footer. */
  nextTour?: MnTourNextTour;
  /** Label of the text link under the body (final card only); no link when absent. */
  link?: string;
  /** Label of the small skip link top right; no link when absent. */
  skip?: string;
  /** Label of the secondary (outline) button; no button when absent. */
  secondary?: string;
  /** Label of the primary button. */
  primary: string;
  /** Progress dots; none when absent. `active` is 0-based. */
  progress?: { total: number; active: number; label: string };
};

/** Counter for unique element ids, so two overlays never share an `aria-labelledby` target. */
let nextOverlayId = 0;

/**
 * The tour's on-screen layer: the dim, the highlight around the target and the step card.
 *
 * Rendered and driven by `MnTourService`, which writes these signals; the component itself
 * holds no tour logic and only reports which control was pressed through {@link action}. It is
 * created once per tour (or offer) and stays mounted between steps, so the card never re-enters:
 * only its content crossfades.
 *
 * Motion lives in the stylesheet and is switched by classes: `is-gliding` animates the
 * highlight's and the card's position, `is-visible` / `is-shown` fade them in (450 ms ease-out)
 * and their absence fades them out (200 ms). `reducedMotion` drops every transition.
 */
@Component({
  selector: 'mn-tour-overlay',
  standalone: true,
  imports: [MnButton],
  templateUrl: './mn-tour-overlay.html',
  styleUrl: './mn-tour-overlay.css',
})
export class MnTourOverlay {
  /** What the card shows; the card is not rendered while null. */
  readonly view = signal<MnTourCardView | null>(null);
  /** Whether the card's content is faded in. Toggled around a content swap. */
  readonly contentVisible = signal(false);
  /** Whether the card itself is faded in. */
  readonly cardVisible = signal(false);
  /** How the card is placed. */
  readonly variant = signal<MnTourCardVariant>('centred');
  /** Which dim is shown. Anything but `none` also blocks clicks on the page. */
  readonly dim = signal<MnTourDim>('none');
  /** The highlight's box (target plus padding), in viewport coordinates. */
  readonly hole = signal<MnTourBox | null>(null);
  /** Whether the highlight (and its dim) is faded in. */
  readonly holeVisible = signal(false);
  /** While true, a change of the highlight's or the card's position glides instead of jumping. */
  readonly gliding = signal(false);
  /** Top-left corner of a `beside` card, in viewport coordinates. */
  readonly cardPos = signal<{ x: number; y: number } | null>(null);
  /** Turns every transition and animation off. */
  readonly reducedMotion = signal(false);

  /** Emitted when the user presses the skip link or one of the buttons. */
  readonly action = output<MnTourCardAction>();

  /** Id of the title element, the dialog's accessible name. */
  protected readonly titleId = `mn-tour-title-${nextOverlayId}`;
  /** Id of the body element, the dialog's accessible description. */
  protected readonly bodyId = `mn-tour-body-${nextOverlayId++}`;

  /** The primary button's look: filled, never wrapping its label. */
  protected readonly primaryButton: Partial<MnButtonTypes> = {
    variant: 'fill',
    color: 'primary',
    size: 'sm',
    borderRadius: 'lg',
    wrap: false,
    hover: true,
  };
  /** The secondary button's look: gray outline (Vorige, Sluiten, Niet nu), never wrapping. */
  protected readonly secondaryButton: Partial<MnButtonTypes> = {
    variant: 'outline',
    color: 'gray',
    size: 'sm',
    borderRadius: 'lg',
    wrap: false,
    hover: true,
  };

  /** The `beside` card's position as a transform, so a glide animates on the compositor. */
  protected readonly cardTransform = computed(() => {
    const pos = this.cardPos();
    return this.variant() === 'beside' && pos ? `translate(${pos.x}px, ${pos.y}px)` : null;
  });

  /** The card element. */
  private readonly cardRef = viewChild<ElementRef<HTMLElement>>('card');

  /** The card's rendered size (padding and border included), or null while it is not rendered. */
  cardSize(): MnTourSize | null {
    const el = this.cardRef()?.nativeElement;
    return el ? { width: el.offsetWidth, height: el.offsetHeight } : null;
  }

  /** Moves focus into the card without scrolling the page. */
  focusCard(): void {
    this.cardRef()?.nativeElement.focus({ preventScroll: true });
  }

  /** Whether focus is currently inside the card. */
  hasFocus(): boolean {
    return this.contains(document.activeElement);
  }

  /** Whether `node` lies inside the card. */
  contains(node: Node | null): boolean {
    const el = this.cardRef()?.nativeElement;
    return !!el && !!node && el.contains(node);
  }

  /**
   * Keeps Tab inside the card: from its last focusable control to its first and back. Focus that
   * is outside the card (or on the card itself) goes to the first or last control.
   * @param event The Tab keydown.
   */
  trapTab(event: KeyboardEvent): void {
    const el = this.cardRef()?.nativeElement;
    if (!el) return;
    const focusable = Array.from(
      el.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      el.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = !!active && focusable.includes(active);
    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  /** The dots to render: one entry per step, true for the active one. */
  protected dots(total: number, active: number): boolean[] {
    return Array.from({ length: total }, (_, i) => i === active);
  }
}
