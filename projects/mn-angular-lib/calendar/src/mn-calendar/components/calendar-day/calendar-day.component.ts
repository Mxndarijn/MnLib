import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Type,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CalendarEvent } from 'mn-angular-lib/calendar-core';
import { CalendarEventData } from 'mn-angular-lib/calendar-core';
import {
  CalendarConfig,
  DEFAULT_CALENDAR_CONFIG,
  HourRow,
  resolveCalendarConfig,
} from 'mn-angular-lib/calendar-core';
import { CalendarDateFormatter } from 'mn-angular-lib/calendar-core';
import { DefaultCalendarDateFormatter } from 'mn-angular-lib/calendar-core';
import { CalendarEventLayoutService } from 'mn-angular-lib/calendar-core';
import { CalendarUtility } from 'mn-angular-lib/calendar-core';
import { CalendarEventComponent } from '../calendar-event/calendar-event.component';
import { MnLanguageService } from 'mn-angular-lib/core';

/** Extended hour row with a pre-resolved display label. */
type DisplayHourRow = {
  hourLabel: string;
} & HourRow;

/**
 * Day grid view showing a single day with half-hour time slots.
 *
 * Shares the same layout algorithm as the week view via
 * {@link CalendarEventLayoutService}.
 */
@Component({
  selector: 'mn-calendar-day',
  standalone: true,
  imports: [CommonModule, CalendarEventComponent],
  templateUrl: './calendar-day.component.html',
  providers: [CalendarEventLayoutService],
  host: { class: 'flex h-full min-h-0 flex-col overflow-hidden' },
})
export class CalendarDayComponent implements OnInit, AfterViewInit, OnDestroy {
  /** Fixed half-hour row height (px) matching the template `1.5rem` rows. */
  static readonly ROW_HEIGHT_PX = 24;

  private readonly lang = inject(MnLanguageService);

  /**
   * Accessible name for this control. Resolved through the conventional
   * `mnCalendar.dayView` key so an app can translate it, falling back to English when the
   * key is not defined rather than leaking the raw key into the UI.
   */
  get dayViewLabel(): string {
    return this.lang.translateIfPresent('mnCalendar.dayView') ?? 'Day view';
  }

  private layoutService = inject(CalendarEventLayoutService);
  private cdr = inject(ChangeDetectorRef);

  /** Scrollable day body — vertical scroll for the full hour range (R7QVk8rz). */
  @ViewChild('bodyScroller') bodyScroller?: ElementRef<HTMLElement>;

  /** The date to display. */
  @Input() focusDay!: Date;
  /** Observable that emits the full event list whenever it changes. */
  @Input() eventsChanged!: Observable<CalendarEvent[]>;
  /** Observable that emits when the focus day changes. */
  @Input() focusDayChanged!: Observable<Date>;
  /** Resolved calendar configuration passed from the parent view. */
  @Input() config?: CalendarConfig;
  /** Optional custom event renderer component. */
  @Input() calendarEventComponent?: Type<CalendarEventData>;
  /** Emits when a calendar event is clicked. */
  @Output() eventClicked = new EventEmitter<CalendarEvent>();

  hourRows: DisplayHourRow[] = [];
  displayEvents: CalendarEvent[] = [];
  totalRows = 0;
  totalColumns = 1;
  currentTimeRow = 0;
  /** The current time, formatted for the label riding the now-line. */
  currentTimeLabel = '';
  isToday = false;
  dayName = '';

  private events: CalendarEvent[] = [];
  private destroy$ = new Subject<void>();
  private formatter: CalendarDateFormatter;
  private resolvedConfig!: CalendarConfig;
  private currentTimeInterval?: ReturnType<typeof setInterval>;

  constructor() {
    this.formatter = new DefaultCalendarDateFormatter();
  }

  ngOnInit() {
    this.resolvedConfig = this.config
      ? resolveCalendarConfig(this.config)
      : { ...DEFAULT_CALENDAR_CONFIG };
    this.updateDayInfo();
    this.updateCurrentTime();
    this.currentTimeInterval = setInterval(() => this.updateCurrentTime(), 60000);

    if (this.eventsChanged) {
      this.eventsChanged.pipe(takeUntil(this.destroy$)).subscribe((events) => {
        this.events = events;
        this.refreshEvents();
        this.cdr.markForCheck();
      });
    }

    if (this.focusDayChanged) {
      this.focusDayChanged.pipe(takeUntil(this.destroy$)).subscribe((date) => {
        this.focusDay = date;
        this.updateDayInfo();
        this.refreshEvents();
        this.updateCurrentTime();
        this.scrollToInitialRow();
        this.cdr.markForCheck();
      });
    }

    // Build hour rows asynchronously (formatTimeI returns a Promise).
    this.buildHourRows().then(() => {
      this.cdr.markForCheck();
      this.scrollToInitialRow();
    });
  }

  ngAfterViewInit(): void {
    this.scrollToInitialRow();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.currentTimeInterval) clearInterval(this.currentTimeInterval);
  }

  /** Returns the CSS `grid-row` value for an event. */
  getEventRow(event: CalendarEvent): string {
    const startRow = CalendarUtility.getCorrectRow(
      event.startTime.getHours(),
      event.startTime.getMinutes(),
      this.resolvedConfig.startHour,
    );
    const endRow = CalendarUtility.getCorrectRow(
      event.endTime.getHours(),
      event.endTime.getMinutes(),
      this.resolvedConfig.startHour,
    );
    return `${startRow} / ${Math.max(endRow, startRow + 1)}`;
  }

  /** Returns the CSS `grid-column` value for an event within its sub-columns. */
  getEventColumn(event: CalendarEvent): string {
    const col = (event.column ?? 0) + 1;
    const width = event.width ?? 1;
    return `${col} / span ${width}`;
  }

  /** Forwards event click to parent. */
  onEventClick(event: CalendarEvent) {
    this.eventClicked.emit(event);
  }

  /** trackBy for hour rows. */
  trackByHour(_index: number, row: DisplayHourRow): number {
    return row.hour;
  }

  /** trackBy for events. */
  trackByEvent(_index: number, event: CalendarEvent): string {
    return event.id;
  }

  private async buildHourRows() {
    const hours = this.resolvedConfig.endHour - this.resolvedConfig.startHour;
    this.totalRows = hours * 2;

    const rows: DisplayHourRow[] = [];
    for (let i = 0; i < hours; i++) {
      const hour = this.resolvedConfig.startHour + i;
      const label = await this.formatter.formatTimeI(hour, 0);
      rows.push({
        hour,
        topRow: i * 2 + 1,
        bottomRow: i * 2 + 3,
        hourLabel: label,
      });
    }
    this.hourRows = rows;
  }

  /** Updates the day name and isToday flag. */
  private updateDayInfo() {
    if (!this.focusDay) return;
    const today = new Date();
    this.isToday = this.formatter.isSameDay(this.focusDay, today);
    const longNames = this.resolvedConfig.longDayNames;
    const dayIdx = this.focusDay.getDay();
    const mondayIdx = dayIdx === 0 ? 6 : dayIdx - 1;
    this.dayName = longNames[mondayIdx];
  }

  /** Filters, splits, and lays out events for the focus day. */
  private refreshEvents() {
    if (!this.focusDay) return;

    const rangeStart = new Date(this.focusDay);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(this.focusDay);
    rangeEnd.setHours(23, 59, 59, 999);

    const filtered = this.events.filter((e) =>
      this.layoutService.eventsOverlap(e.startTime, e.endTime, rangeStart, rangeEnd),
    );

    this.displayEvents = this.layoutService.calculateMultiDayEvents(
      filtered,
      this.resolvedConfig.startHour,
      this.resolvedConfig.endHour,
      rangeStart,
      rangeEnd,
    );

    this.layoutService.assignColumnsToEvents(this.displayEvents);
    this.layoutService.assignWidthsToEvents(this.displayEvents, rangeStart, rangeEnd);

    this.totalColumns = this.displayEvents.reduce(
      (max, e) => Math.max(max, (e.column ?? 0) + (e.width ?? 1)),
      1,
    );
  }

  /**
   * Scrolls the body to the current hour (today) or the first event so evening
   * slots are one scroll away instead of clipped (SuperBottie option 1 / R7QVk8rz).
   */
  scrollToInitialRow(): void {
    const el = this.bodyScroller?.nativeElement;
    if (!el || this.totalRows <= 0) {
      return;
    }
    const targetRow = this.resolveInitialScrollRow();
    if (targetRow <= 1) {
      el.scrollTop = 0;
      return;
    }
    const rowPx = CalendarDayComponent.ROW_HEIGHT_PX;
    const offset = (targetRow - 1) * rowPx - el.clientHeight / 3;
    el.scrollTop = Math.max(0, offset);
  }

  /** 1-based grid row to land on: now-line, else earliest event, else top. */
  private resolveInitialScrollRow(): number {
    if (this.isToday && this.currentTimeRow > 0) {
      return this.currentTimeRow;
    }
    let earliest = Number.POSITIVE_INFINITY;
    for (const event of this.displayEvents) {
      const row = CalendarUtility.getCorrectRow(
        event.startTime.getHours(),
        event.startTime.getMinutes(),
        this.resolvedConfig.startHour,
      );
      if (row > 0 && row < earliest) {
        earliest = row;
      }
    }
    return Number.isFinite(earliest) ? earliest : 1;
  }

  /** Updates the current-time red line position. */
  private updateCurrentTime() {
    const now = new Date();
    if (this.focusDay && this.formatter.isSameDay(this.focusDay, now)) {
      this.currentTimeRow = CalendarUtility.getCorrectRow(
        now.getHours(),
        now.getMinutes(),
        this.resolvedConfig.startHour,
      );
      this.isToday = true;
      // formatTime is async; refresh the label and re-render when it resolves.
      this.formatter.formatTime(now).then((label) => {
        this.currentTimeLabel = label;
        this.cdr.markForCheck();
      });
    } else {
      this.currentTimeRow = 0;
      this.isToday = false;
      this.currentTimeLabel = '';
    }
    // The minute tick is a bare setInterval, so neither branch is reached through anything
    // Angular wraps. Only the `then` above marked anything, which left a view opened on a
    // day that stops being today painting its "now" line forever.
    this.cdr.markForCheck();
  }
}
