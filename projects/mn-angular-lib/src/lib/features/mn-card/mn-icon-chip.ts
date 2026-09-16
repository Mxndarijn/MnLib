import { Component, HostBinding, Input } from '@angular/core';
import { MnIconChipTypes } from './mn-icon-chipTypes';
import { mnIconChipVariants } from './mn-icon-chipVariants';

/**
 * The tinted square that carries an icon in front of a card title, a stat or a list
 * row: the one place a colour says "what kind of thing this is". Project the icon as
 * content; the chip sizes and tints itself and never grows with the row.
 *
 * Decorative for assistive technology: the title or label beside it carries the
 * meaning, so the chip is `aria-hidden` and a screen reader never meets a bare icon.
 *
 * ```html
 * <mn-icon-chip [data]="{ color: 'success', size: 'md' }">
 *   <svg lucideCheck [size]="20"></svg>
 * </mn-icon-chip>
 * ```
 */
@Component({
  selector: 'mn-icon-chip',
  standalone: true,
  templateUrl: './mn-icon-chip.html',
  host: { 'aria-hidden': 'true' },
})
export class MnIconChip {
  /** Size and colour; see {@link MnIconChipTypes}. */
  @Input() data: Partial<MnIconChipTypes> = {};

  /** The chip's own classes; the consumer's static classes merge with them. */
  @HostBinding('class')
  get hostClasses(): string {
    return mnIconChipVariants({
      size: this.data.size,
      color: this.data.color,
    });
  }
}
