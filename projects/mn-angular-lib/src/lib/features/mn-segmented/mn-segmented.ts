import { Component, EventEmitter, inject, Input, Output, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { MnLanguageService, MnTranslatePipe } from '../../language';
import { MnSegmentedDataSource, MnSegmentedItem } from './mn-segmentedTypes';
import { mnSegmentedVariants } from './mn-segmentedVariants';

/** Icon edge length per size, so a segment's glyph matches its own text. */
const ICON_SIZE: Record<'sm' | 'md', number> = { sm: 16, md: 18 };

/**
 * A segmented control: two or three mutually exclusive choices sharing one
 * track, of which exactly one is active — a view switch (list ⇄ calendar), a
 * scope switch (mine ⇄ everyone), a range switch (week ⇄ month).
 *
 * The selection is **controlled**: the component renders whatever
 * {@link value} says and emits {@link valueChange} on a click, so the consumer's
 * own state stays the single source of truth for what is on screen. It keeps no
 * copy of the selection, and — unlike `mn-tab` — it does not mirror one into the
 * URL, so it can sit on a page that already has a tab bar without the two
 * fighting over the query string.
 *
 * For switching between panes of a page, reach for `mn-tab`; this is for
 * switching how one pane is rendered.
 */
@Component({
  selector: 'mn-segmented',
  standalone: true,
  imports: [MnTranslatePipe, NgTemplateOutlet, LucideDynamicIcon],
  templateUrl: './mn-segmented.html',
})
export class MnSegmented {
  /** The choices and how the group is labelled and scaled. */
  @Input({ required: true }) dataSource!: MnSegmentedDataSource;

  /**
   * Value of the active segment. No value (or one naming no segment) leaves the
   * control with nothing active, which is what an unresolved selection should
   * look like — the component never picks one on the consumer's behalf.
   */
  @Input() value?: string;

  /**
   * Whether the segments stretch to fill the available width. Defaults to false,
   * so the control hugs its content and can be parked at the end of a row; turn
   * it on where it should span its container, typically on a narrow screen.
   */
  @Input() justified = false;

  /** Emits the picked segment's value. The consumer decides what to do with it. */
  @Output() valueChange = new EventEmitter<string>();

  /** Resolves this control's own accessible names against the app's bundle. */
  private readonly lang = inject(MnLanguageService);

  /** Resolved slot classes for the current size and layout. */
  get styles() {
    return mnSegmentedVariants({
      size: this.dataSource.size,
      borderRadius: this.dataSource.borderRadius,
      justified: this.justified,
    });
  }

  /** Icon edge length matching the control's text size. */
  get iconSize(): number {
    return ICON_SIZE[this.dataSource.size ?? 'md'];
  }

  /** Accessible name of the group, or null when the consumer named nothing. */
  get groupLabel(): string | null {
    const key = this.dataSource.ariaLabel;
    return key ? this.lang.translate(key) : null;
  }

  /**
   * Whether `item` is the active choice.
   * @param item - The segment to test.
   */
  isActive(item: MnSegmentedItem): boolean {
    return item.value === this.value;
  }

  /**
   * Classes for one segment, which differ only in whether it is the active one.
   * @param item - The segment to style.
   */
  segmentClass(item: MnSegmentedItem): string {
    return mnSegmentedVariants({
      size: this.dataSource.size,
      borderRadius: this.dataSource.borderRadius,
      justified: this.justified,
      active: this.isActive(item),
    }).segment();
  }

  /**
   * Accessible name for an icon-only segment, or null when the segment shows a
   * label — that label already names it, and a second name would only compete.
   * @param item - The segment to name.
   */
  segmentLabel(item: MnSegmentedItem): string | null {
    if (item.label || !item.ariaLabel) return null;
    return this.lang.translate(item.ariaLabel);
  }

  /**
   * Whether an icon was supplied as a `TemplateRef` rather than lucide icon data.
   * @param value - The icon to test.
   */
  isTemplateRef(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef;
  }

  /**
   * Announces a click. Re-picking the active segment is silent: it is not a
   * change, and a consumer that reloads on every emission would refetch for
   * nothing.
   * @param item - The segment that was clicked.
   */
  select(item: MnSegmentedItem): void {
    if (item.disabled || this.isActive(item)) return;
    this.valueChange.emit(item.value);
  }
}
