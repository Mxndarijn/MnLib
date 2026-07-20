import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  OnInit,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {LucideChevronLeft, LucideChevronRight} from '@lucide/angular';
import {MnButton} from '../mn-button';
import {MnDatetime} from '../mn-datetime';
import {MnLanguageService} from '../../language';

/**
 * How the bar arranges itself at its current width.
 *
 * - `inline` — the month, the day strip and Today all share one row. The bar
 *   never stacks: as space runs out it shows fewer days rather than adding a row.
 * - `compact` — too narrow even for a three-day strip, so the days give way to a
 *   date picker sitting beside Today.
 *
 * Resolved from the bar's own width — not the viewport — so a bar in a narrow
 * sidebar lays itself out like a phone even on a wide screen.
 */
export type DateSelectorBarLayout = 'compact' | 'inline';

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
  /**
   * Whether this tile is the first day of a month within the visible strip. The
   * days either side of it move apart, so the break is visible without a label —
   * the month caption above the strip names both months.
   */
  startsNewMonth: boolean;
  /** Whether this tile is the currently selected date. */
  isSelected: boolean;
  /** Whether this tile represents today. */
  isToday: boolean;
  /** Full, locale-formatted date used as the tile's accessible name. */
  accessibleLabel: string;
};

/** A full week: the most days the strip shows, and the size it aligns to. */
const DAYS_IN_WEEK = 7;
/** Fewest days worth showing before the picker takes over instead. */
const MIN_TILE_COUNT = 3;
/** `Date.getDay()` value for Monday. */
const MONDAY = 1;
/**
 * Width one day occupies. Days are sized by their content: a three-letter weekday
 * and a two-digit number at their set sizes measure about 72px including padding,
 * plus the `gap-1` beside it. Rounded up, because coming in under the real width
 * overflows the strip into the arrow beside it.
 */
const TILE_SLOT_WIDTH = 80;
/** Space reserved for the two borderless window arrows and their gaps. */
const ARROWS_ZONE_WIDTH = 88;
/**
 * Space the Today button claims, including the bar's own horizontal padding and
 * the gap beside it.
 */
const CONTROLS_ZONE_WIDTH = 150;
/** Space the month caption claims beside the strip. */
const MONTH_CAPTION_WIDTH = 88;
/** Everything on the row that isn't a day tile. */
const RESERVED_WIDTH = ARROWS_ZONE_WIDTH + CONTROLS_ZONE_WIDTH + MONTH_CAPTION_WIDTH;
/** Below this the strip can't hold even {@link MIN_TILE_COUNT} days. */
const COMPACT_MAX_WIDTH = MIN_TILE_COUNT * TILE_SLOT_WIDTH + RESERVED_WIDTH;
/** Assumed width before the first measurement (and during server-side rendering). */
const UNMEASURED_WIDTH = 960;

/** Counter used to give each bar instance a unique date-picker id. */
let instanceCounter = 0;

/**
 * Reusable, responsive date selector bar.
 *
 * Renders a "Today" button, a month caption, previous/next arrows and a strip of
 * day tiles. Selecting a tile or pressing "Today" emits the chosen day via
 * {@link dateSelected}. The arrows only shift the visible days and never emit.
 *
 * Given room, the strip is a whole week running Monday to Sunday, so the weekday
 * columns hold still as you page and no weekday appears twice. As the bar narrows
 * it shows fewer days rather than adding a second row — a partial strip has no
 * week to align to, so it slides to keep the selection in view instead. Narrower
 * still, and the days give way to a date picker beside Today, which keeps every
 * date reachable on a phone rather than leaving a strip too cramped to use.
 *
 * Selecting a day already on the strip leaves it exactly where it is; a selection
 * from outside moves the strip to where that day is. The arrows page by whatever
 * is on show, without touching the selection.
 *
 * The component carries no hard-coded copy: button, placeholder and assistive
 * text are supplied through the label inputs, and day/month names follow
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
  // Styling lives entirely in the template as Tailwind utilities, as elsewhere in
  // the library — there is no stylesheet for this component.
  host: {class: 'block'},
})
export class MnDateSelectorBar implements OnInit {
  /** The currently selected date, provided by the parent. */
  readonly selectedDate = input<Date>(this.getToday());
  /** Label for the "Today" button. */
  readonly todayLabel = input<string>('Today');
  /** Placeholder for the date picker shown in place of a too-cramped week strip. */
  readonly pickDateLabel = input<string>('Pick a date');
  /** Accessible name for the previous-week arrow. */
  readonly previousLabel = input<string>('Show the previous week');
  /** Accessible name for the next-week arrow. */
  readonly nextLabel = input<string>('Show the next week');
  /** Accessible name for the day strip as a whole. */
  readonly dayStripLabel = input<string>('Select a day');
  /**
   * BCP 47 locale used to format day/month names. When empty, the active
   * {@link MnLanguageService} locale is used.
   */
  readonly locale = input<string>('');
  /** Emits when the user selects a new date. */
  readonly dateSelected = output<Date>();

  /** Unique id for this instance's date picker, so several bars can coexist. */
  readonly pickerId = `mn-dsb-date-${++instanceCounter}`;

  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly lang = inject(MnLanguageService);

  private readonly tileButtons = viewChildren<ElementRef<HTMLButtonElement>>('tileButton');

  /** The bar's own width in px, tracked so the layout follows its container. */
  private readonly containerWidth = signal<number>(0);
  /** Bumped whenever the active language changes so name formatting re-runs. */
  private readonly localeTick = signal(0);

  /** How the bar is arranged at the current width. */
  readonly layout = computed<DateSelectorBarLayout>(() =>
    (this.containerWidth() || UNMEASURED_WIDTH) >= COMPACT_MAX_WIDTH ? 'inline' : 'compact',
  );

  /** Whether the day strip is shown, or the picker has taken its place. */
  readonly showDayStrip = computed<boolean>(() => this.layout() === 'inline');

  /**
   * Days in the visible strip: a full week where there's room, fewer as the bar
   * narrows. The bar drops days rather than adding a second row, so it stays one
   * line at every width it can.
   */
  readonly tileCount = computed<number>(() => {
    if (!this.showDayStrip()) return 0;
    const width = this.containerWidth() || UNMEASURED_WIDTH;
    const fits = Math.floor((width - RESERVED_WIDTH) / TILE_SLOT_WIDTH);
    return Math.min(DAYS_IN_WEEK, Math.max(MIN_TILE_COUNT, fits));
  });


  /** Effective locale: explicit input, else the active app locale. */
  private readonly effectiveLocale = computed<string>(() => {
    this.localeTick();
    return this.locale() || this.lang.locale;
  });

  /**
   * First day of the visible strip — the week's Monday when a whole week is on
   * show, otherwise whatever start keeps the selection in view.
   *
   * The strip holds still while the selection stays on screen; a selection
   * outside it moves to where that day is. The arrows write here directly to page
   * away from the selection.
   */
  private readonly windowStart = linkedSignal<{selected: number; count: number}, Date>({
    source: () => ({selected: this.selectedDate().getTime(), count: this.tileCount()}),
    computation: (source, previous) => {
      const selected = new Date(source.selected);
      const {count} = source;
      const anchored = this.anchorFor(selected, count);
      if (!previous || count === 0) return anchored;

      const current = previous.value;
      const holdsSelection = (() => {
        const offset = this.daysBetween(current, selected);
        return offset >= 0 && offset < count;
      })();

      // A whole week must also still be Monday-aligned to be worth keeping —
      // otherwise a strip that grew back to seven would keep a stale start.
      const stillValid = count === DAYS_IN_WEEK
        ? holdsSelection && current.getDay() === MONDAY
        : holdsSelection;

      return stillValid ? current : anchored;
    },
  });

  /**
   * Index of the tile that is currently keyboard-reachable (roving tabindex).
   * Tracks the selection so Tab lands on the selected day, falling back to Monday
   * when the selection has been paged out of sight.
   */
  private readonly focusedIndex = linkedSignal<number, number>({
    source: () => this.selectedDate().getTime(),
    computation: () => Math.max(0, this.indexOfSelected()),
  });

  /** The visible days, derived from the window start and the current selection. */
  readonly dayTiles = computed<DayTile[]>(() => {
    const count = this.tileCount();
    if (count === 0) return [];

    const start = this.windowStart();
    const selected = this.selectedDate();
    const today = this.getToday();
    const locale = this.effectiveLocale();

    const tiles: DayTile[] = [];
    let previousMonth = -1;
    let previousYear = -1;

    for (let i = 0; i < count; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);

      const month = date.getMonth();
      const year = date.getFullYear();
      const startsNewMonth = i > 0 && (month !== previousMonth || year !== previousYear);

      tiles.push({
        date,
        dayName: date.toLocaleDateString(locale, {weekday: 'short'}),
        dayNumber: date.getDate(),
        monthName: date.toLocaleDateString(locale, {month: 'short'}),
        startsNewMonth,
        isSelected: this.isSameDay(date, selected),
        isToday: this.isSameDay(date, today),
        accessibleLabel: date.toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      });

      previousMonth = month;
      previousYear = year;
    }

    return tiles;
  });

  /**
   * Names the month the strip is currently in, so the days are never just loose
   * numbers. Reads as a range when the strip straddles two months, and carries
   * both years when it straddles two of those.
   */
  readonly monthCaption = computed<string>(() => {
    const locale = this.effectiveLocale();
    const tiles = this.dayTiles();

    // With no strip to describe — the compact layout — the caption names the
    // month the selection sits in, so the bar is never unlabelled.
    if (!tiles.length) {
      return this.selectedDate().toLocaleDateString(locale, {month: 'short', year: 'numeric'});
    }

    const first = tiles[0].date;
    const last = tiles[tiles.length - 1].date;

    if (first.getFullYear() !== last.getFullYear()) {
      const from = first.toLocaleDateString(locale, {month: 'short', year: 'numeric'});
      const to = last.toLocaleDateString(locale, {month: 'short', year: 'numeric'});
      return `${from} – ${to}`;
    }

    if (first.getMonth() !== last.getMonth()) {
      const from = first.toLocaleDateString(locale, {month: 'short'});
      const to = last.toLocaleDateString(locale, {month: 'short', year: 'numeric'});
      return `${from} – ${to}`;
    }

    return first.toLocaleDateString(locale, {month: 'short', year: 'numeric'});
  });

  /** The selected date formatted as YYYY-MM-DD for the date-picker input. */
  readonly selectedDateString = computed<string>(() => {
    const d = this.selectedDate();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  /**
   * Props for the compact-layout date picker. Sized to match the Today button it
   * sits beside, and filling the rest of the row so it stays an easy tap target.
   */
  readonly pickerProps = computed(() => ({
    id: this.pickerId,
    mode: 'date' as const,
    placeholder: this.pickDateLabel(),
    size: 'md' as const,
    borderRadius: 'lg' as const,
    hover: true,
    fullWidth: true,
  }));

  ngOnInit(): void {
    // Re-format names when the active language changes.
    this.lang.locale$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.localeTick.update((v) => v + 1));

    this.observeOwnWidth();
  }

  /** Shows the days before the visible ones, without changing the selection. */
  navigatePrevious(): void {
    this.shiftWindow(-1);
  }

  /** Shows the days after the visible ones, without changing the selection. */
  navigateNext(): void {
    this.shiftWindow(1);
  }

  /** Returns to today: brings today into the strip and selects it. */
  goToToday(): void {
    const today = this.getToday();
    // Move explicitly: when today is already selected the window signal has no new
    // source value to react to, but the user still expects to land on it.
    this.windowStart.set(this.anchorFor(today, this.tileCount()));
    // Only emit when today isn't already selected, so pressing "Today" while on
    // today doesn't trigger a redundant reload.
    if (!this.isSameDay(today, this.selectedDate())) {
      this.dateSelected.emit(today);
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
   * Handles the date-picker model change: shows the picked day's week and emits
   * it (unless it is already the selected day).
   * @param value The date string in YYYY-MM-DD format.
   */
  onDateModelChanged(value: string): void {
    if (!value) return;
    const picked = new Date(value + 'T00:00:00');
    if (isNaN(picked.getTime())) return;

    this.windowStart.set(this.anchorFor(picked, this.tileCount()));
    // Picking the day that's already selected shouldn't re-emit.
    if (!this.isSameDay(picked, this.selectedDate())) {
      this.dateSelected.emit(picked);
    }
  }

  /** Whether the tile at `index` is the one reachable with Tab. */
  isTabbable(index: number): boolean {
    return index === this.focusedIndex();
  }

  /** Remembers which tile last held focus, so Tab returns to it. */
  onTileFocus(index: number): void {
    this.focusedIndex.set(index);
  }

  /**
   * Moves focus across the week with the arrow keys. Running off either end turns
   * the page to the neighbouring week and lands on the day that continues the run,
   * so the weeks read as one continuous calendar.
   */
  onTileKeydown(event: KeyboardEvent, index: number): void {
    const lastIndex = this.tileCount() - 1;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        if (index < lastIndex) {
          this.moveFocusTo(index + 1);
        } else {
          // Off the end: turn the page and land on the day that continues the run.
          this.shiftWindow(1);
          this.moveFocusTo(0);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) {
          this.moveFocusTo(index - 1);
        } else {
          this.shiftWindow(-1);
          this.moveFocusTo(lastIndex);
        }
        break;

      case 'Home':
        event.preventDefault();
        this.moveFocusTo(0);
        break;

      case 'End':
        event.preventDefault();
        this.moveFocusTo(lastIndex);
        break;

      default:
        break;
    }
  }

  /** trackBy key for day tiles. */
  trackByTile(_index: number, tile: DayTile): number {
    return tile.date.getTime();
  }

  /**
   * Moves the strip by `pages` of whatever it is currently showing. Paging by the
   * visible count is what keeps a full week Monday-aligned — seven days forward
   * from a Monday is the next Monday.
   */
  private shiftWindow(pages: number): void {
    const next = new Date(this.windowStart());
    next.setDate(next.getDate() + pages * this.tileCount());
    this.windowStart.set(next);
  }

  /** Focuses the tile at `index` once the week has rendered. */
  private moveFocusTo(index: number): void {
    this.focusedIndex.set(index);
    afterNextRender(
      () => this.tileButtons()[index]?.nativeElement.focus(),
      {injector: this.injector},
    );
  }

  /** Index of the selected day within the visible week, or -1 when off-week. */
  private indexOfSelected(): number {
    return this.dayTiles().findIndex((tile) => tile.isSelected);
  }

  /**
   * Where the strip should start to show `date` among `count` days: the week's
   * Monday when a whole week is on show, otherwise centred on the day, since a
   * partial strip has no week to align to.
   */
  private anchorFor(date: Date, count: number): Date {
    if (count === DAYS_IN_WEEK) return this.startOfWeek(date);

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - Math.floor(count / 2));
    return start;
  }

  /**
   * Returns the Monday of the week containing `date`. `getDay()` counts from
   * Sunday, so the shift maps Sunday to the end of the week rather than the start.
   */
  private startOfWeek(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  }

  /** Whole calendar days from `from` to `to`, ignoring time of day and DST. */
  private daysBetween(from: Date, to: Date): number {
    const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b - a) / 86400000);
  }

  /** Tracks the bar's own width so the layout responds to its container. */
  private observeOwnWidth(): void {
    const element = this.host.nativeElement;
    this.containerWidth.set(element.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) this.containerWidth.set(width);
    });
    observer.observe(element);
    this.destroyRef.onDestroy(() => observer.disconnect());
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
