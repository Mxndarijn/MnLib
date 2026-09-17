import { Component, HostBinding, Input } from '@angular/core';
import { MnTranslatePipe } from 'mn-angular-lib/core';
import { MnCard } from './mn-card';
import { MnIconChip } from './mn-icon-chip';
import { MnIconChipVariants } from './mn-icon-chipVariants';

/** Configuration of one {@link MnStatTile}. */
export type MnStatTileTypes = {
  /** Colour of the chip; the number itself stays in the base text colour. Defaults to `primary`. */
  color: MnIconChipVariants['color'];
};

/**
 * One fact at a glance: a tinted icon chip, a muted label and a large tabular number,
 * on the {@link MnCard} shell, in a tile that shares a row with its siblings as
 * `flex-1`. Project the icon as content; project a badge or a short note into the
 * `trailing` slot when the number needs a qualifier.
 *
 * ```html
 * <div class="flex flex-wrap gap-4">
 *   <mn-stat-tile label="meetings.attending" [value]="yesCount" [data]="{ color: 'success' }">
 *     <svg lucideCheck [size]="20"></svg>
 *   </mn-stat-tile>
 * </div>
 * ```
 */
@Component({
  selector: 'mn-stat-tile',
  standalone: true,
  imports: [MnCard, MnIconChip, MnTranslatePipe],
  templateUrl: './mn-stat-tile.html',
})
export class MnStatTile {
  /** Caption under the number, as a translation key or a literal. */
  @Input({ required: true }) label!: string;

  /** The figure, already formatted for display. */
  @Input({ required: true }) value!: string | number;

  /** Colour of the chip; see {@link MnStatTileTypes}. */
  @Input() data: Partial<MnStatTileTypes> = {};

  /** Grows to share its row and never forces the row wider than its siblings. */
  @HostBinding('class')
  readonly hostClasses = 'flex flex-1 basis-40 min-w-0';
}
