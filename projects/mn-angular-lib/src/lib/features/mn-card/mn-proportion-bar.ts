import { Component, inject, Input } from '@angular/core';
import { MnLanguageService } from '../../language';
import { MnProportionBarTypes, MnProportionSegment } from './mn-proportion-barTypes';

/** Fill class per colour, spelled out so Tailwind's scanner finds every one. */
const SEGMENT_CLASS: Record<MnProportionSegment['color'], string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-error',
  gray: 'bg-base-content/25',
};

/** Track height per size. */
const HEIGHT_CLASS: Record<MnProportionBarTypes['height'], string> = {
  sm: 'h-2',
  md: 'h-2.5',
};

/** A segment resolved to a rendered width. */
export type MnRenderedProportionSegment = {
  /** Percentage of the track this run covers. */
  widthPct: number;
  /** Fill class for the run. */
  fillClass: string;
};

/**
 * The proportional bar every turnout, budget, capacity and collection figure draws:
 * a rounded track with one coloured run per segment, widths from the values. Empty
 * segments are skipped so a zero never leaves a hairline. Announced as one image with
 * the caller's label, because the numbers it visualises are always written out next
 * to it.
 *
 * ```html
 * <mn-proportion-bar
 *   [segments]="[{ value: yes, color: 'success' }, { value: maybe, color: 'warning' }]"
 *   [total]="invited"
 *   ariaLabel="meetings.responses.title">
 * </mn-proportion-bar>
 * ```
 */
@Component({
  selector: 'mn-proportion-bar',
  standalone: true,
  templateUrl: './mn-proportion-bar.html',
})
export class MnProportionBar {
  /** The coloured runs, in draw order from the left. */
  @Input({ required: true }) segments!: MnProportionSegment[];

  /** The whole the segments are measured against; defaults to their sum. */
  @Input() total?: number | null;

  /** Accessible name for the bar as a whole, as a translation key or a literal. */
  @Input({ required: true }) ariaLabel!: string;

  /** Track thickness; see {@link MnProportionBarTypes}. */
  @Input() data: Partial<MnProportionBarTypes> = {};

  /** Resolves the accessible name against the app's bundle. */
  private readonly lang = inject(MnLanguageService);

  /** The translated accessible name. */
  get label(): string {
    return this.lang.translate(this.ariaLabel);
  }

  /** Every class on the track element. */
  get trackClass(): string {
    return `flex w-full overflow-hidden rounded-full bg-base-content/10 ${HEIGHT_CLASS[this.data.height ?? 'md']}`;
  }

  /** The denominator actually used: the explicit total when positive, else the segment sum. */
  private get denominator(): number {
    const explicit = this.total;
    if (explicit !== null && explicit !== undefined && explicit > 0) return explicit;
    return this.segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  }

  /** Segments with a width, empty ones dropped. */
  get rendered(): MnRenderedProportionSegment[] {
    const denominator = this.denominator;
    if (denominator <= 0) return [];
    return this.segments
      .filter((segment) => segment.value > 0)
      .map((segment) => ({
        widthPct: Math.min(100, (segment.value / denominator) * 100),
        fillClass: SEGMENT_CLASS[segment.color],
      }));
  }
}
