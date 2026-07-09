import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {fromEvent} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {LucideChevronLeft, LucideChevronRight} from '@lucide/angular';
import {MnButton} from '../mn-button';
import {MnDatetime} from '../mn-datetime';
import {MnLanguageService} from '../../language';

/**
 * A single step in the responsive day-tile ladder: at viewport widths of at least
 * {@link minWidth} pixels, render {@link tiles} day tiles.
 */
type TileBreakpoint = {
  /** Minimum viewport width (px) at which this step applies. */
  minWidth: number;
  /** Number of day tiles to render at or above {@link minWidth}. */
  tiles: number;
};

/**
 * Custom day-tile breakpoint ladder, evaluated from widest to narrowest so the
 * first matching {@link TileBreakpoint.minWidth} wins.
 *
 * The counts are tuned to the bar's two-layout responsive design. Below the
 * template's `xl` breakpoint (1280px) the bar stacks and the day strip gets its
 * own full-width row, so it can afford more tiles; at/above `xl` everything sits on
 * one row alongside the Today button, arrows, divider and date picker (≥1500px);
 * below that the strip sits on its own full-width row, so a full week fits without
 * crowding. The steps:
 * - ≥ 1028px: 7 tiles — the strip's own row (or the wide single-row layout) has
 *   room for a full week.
 * - 640–1027px: 5 tiles — small tablets / large phones.
 * - below 640px: 3 tiles — phones stay compact and page via the arrows.
 *
 * Note: below {@link MnDateSelectorBar.MIN_STRIP_WIDTH}px the strip is hidden
 * entirely (only Today + the date picker remain), so those counts never render.
 */
const TILE_BREAKPOINTS: readonly TileBreakpoint[] = [
  {minWidth: 1028, tiles: 7},
  {minWidth: 640, tiles: 5},
  {minWidth: 0, tiles: 3},
];

/** Represents a single day tile in the date selector. */
export type DayTile = {
  /** The full date object (at midnight). */
  date: Date;
  /** Short day name (e.g. 'ma', 'Mon'). */
  dayName: string;
  /** Day-of-month number. */
  dayNumber: number;
  /** Short month name (e.g. 'mei', 'Jun'). */
  monthName: string;
  /** Whether this tile is the currently selected date. */
  isSelected: boolean;
  /** Whether this tile represents today. */
  isToday: boolean;
};

/**
 * Reusable, responsive date selector bar.
 *
 * Renders a "Today" button, previous/next day-window arrows, a strip of day
 * tiles (3 → 5 → 7 as the viewport widens; see {@link TILE_BREAKPOINTS}) and a
 * date picker. Selecting a
 * tile, pressing "Today", or picking a date through the picker emits the chosen
 * day via {@link dateSelected}. The arrows only shift the visible tile window and
 * never emit.
 *
 * The component carries no hard-coded copy: button/placeholder text is supplied
 * through {@link todayLabel} / {@link pickDateLabel}, and day/month names follow
 * {@link locale} (falling back to the active {@link MnLanguageService} locale).
 *
 * @example
 * ```html
 * <mn-date-selector-bar
 *   [selectedDate]="focusDay"
 *   [todayLabel]="'Today'"
 *   [pickDateLabel]="'Pick a date'"
 *   [locale]="'nl-NL'"
 *   (dateSelected)="onDaySelected($event)">
 * </mn-date-selector-bar>
 * ```
 */
@Component({
  selector: 'mn-date-selector-bar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MnButton,
    MnDatetime,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  templateUrl: './mn-date-selector-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnDateSelectorBar implements OnInit {
  /**
   * Minimum viewport width (px) at which the day strip (arrows + tiles) is shown.
   * On narrower screens there isn't room for it, so only the Today button and the
   * date picker remain.
   */
  private static readonly MIN_STRIP_WIDTH = 320;
  /** The currently selected date, provided by the parent. */
  readonly selectedDate = input<Date>(this.getToday());
  /** Label for the "Today" button. */
  readonly todayLabel = input<string>('Today');
  /** Placeholder for the date picker input. */
  readonly pickDateLabel = input<string>('Pick a date');
  /**
   * BCP 47 locale used to format day/month names. When empty, the active
   * {@link MnLanguageService} locale is used.
   */
  readonly locale = input<string>('');
  /** Emits when the user selects a new date. */
  readonly dateSelected = output<Date>();
  /** The selected date formatted as YYYY-MM-DD for the date-picker input. */
  readonly selectedDateString = computed<string>(() => {
    const d = this.selectedDate();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  private readonly destroyRef = inject(DestroyRef);
  private readonly lang = inject(MnLanguageService);
  /** Current viewport width in pixels, tracked so the tile count stays responsive. */
  private readonly viewportWidth = signal<number>(this.getViewportWidth());
  /**
   * Whether the day strip (arrows + day tiles) is shown. Below
   * {@link MnDateSelectorBar.MIN_STRIP_WIDTH} it is hidden, leaving only the Today
   * button and the date picker.
   */
  readonly showDayStrip = computed<boolean>(
    () => this.viewportWidth() >= MnDateSelectorBar.MIN_STRIP_WIDTH,
  );
  /** Start offset (in days from today) for the visible day-tile window. */
  private readonly dayOffset = signal(0);
  /** Bumped whenever the active language changes so name formatting re-runs. */
  private readonly localeTick = signal(0);
  /**
   * Number of day tiles to render, resolved from {@link TILE_BREAKPOINTS} against
   * the current viewport width (3 → 5 → 7 as the screen widens).
   */
  private readonly tileCount = computed<number>(() => {
    const width = this.viewportWidth();
    return (
      TILE_BREAKPOINTS.find((bp) => width >= bp.minWidth)?.tiles ??
      TILE_BREAKPOINTS[TILE_BREAKPOINTS.length - 1].tiles
    );
  });
  /** Effective locale: explicit input, else the active app locale. */
  private readonly effectiveLocale = computed<string>(() => {
    this.localeTick();
    return this.locale() || this.lang.locale;
  });
  /** The visible day tiles, derived from the selected date, offset and viewport. */
  readonly dayTiles = computed<DayTile[]>(() => {
    const today = this.getToday();
    const selected = this.selectedDate();
    const offset = this.dayOffset();
    const count = this.tileCount();
    const locale = this.effectiveLocale();
    const tiles: DayTile[] = [];

    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset + i);
      tiles.push({
        date,
        dayName: date.toLocaleDateString(locale, {weekday: 'short'}),
        dayNumber: date.getDate(),
        monthName: date.toLocaleDateString(locale, {month: 'short'}),
        isSelected: this.isSameDay(date, selected),
        isToday: this.isSameDay(date, today),
      });
    }

    return tiles;
  });

  ngOnInit(): void {
    // Re-format names when the active language changes.
    this.lang.locale$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.localeTick.update((v) => v + 1));

    // Track viewport width so the tile count stays responsive.
    if (typeof window !== 'undefined') {
      fromEvent(window, 'resize')
        .pipe(debounceTime(100), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.viewportWidth.set(this.getViewportWidth()));
    }
  }

  /** Shifts the visible window back by one tile-count without changing the selection. */
  navigatePrevious(): void {
    this.dayOffset.update((o) => o - this.tileCount());
  }

  /** Shifts the visible window forward by one tile-count without changing the selection. */
  navigateNext(): void {
    this.dayOffset.update((o) => o + this.tileCount());
  }

  /** Resets the window to today and selects today. */
  goToToday(): void {
    this.dayOffset.set(0);
    // Only emit when today isn't already the selected day, so pressing "Today"
    // while on today doesn't trigger a redundant reload.
    if (!this.isSameDay(this.getToday(), this.selectedDate())) {
      this.dateSelected.emit(this.getToday());
    }
  }

  /** Selects a date and emits it, unless it is already the selected day. */
  selectDate(date: Date): void {
    // Re-selecting the current day is a no-op: emitting again would make
    // consumers reload for no change.
    if (this.isSameDay(date, this.selectedDate())) return;
    this.dateSelected.emit(date);
  }

  /**
   * Handles the date-picker model change: centres the window on the picked date
   * and emits it (unless it is already the selected day).
   * @param value The date string in YYYY-MM-DD format.
   */
  onDateModelChanged(value: string): void {
    if (!value) return;
    const picked = new Date(value + 'T00:00:00');
    if (isNaN(picked.getTime())) return;
    const today = this.getToday();
    const diffDays = Math.round((picked.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // Centre the picked date in the visible tile window.
    this.dayOffset.set(diffDays - Math.floor(this.tileCount() / 2));
    // Picking the day that's already selected shouldn't re-emit.
    if (!this.isSameDay(picked, this.selectedDate())) {
      this.dateSelected.emit(picked);
    }
  }

  /**
   * Returns the current viewport width in pixels, falling back to a desktop-ish
   * width when there is no window (e.g. server-side rendering).
   */
  private getViewportWidth(): number {
    return typeof window === 'undefined' ? 1280 : window.innerWidth;
  }

  /** Returns a Date object for today at midnight. */
  private getToday(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  /** Checks whether two dates fall on the same calendar day. */
  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
