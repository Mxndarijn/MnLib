import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Type
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Observable, Subject, takeUntil} from 'rxjs';
import {CalendarEvent} from '../../models/calendar-event.model';
import {CalendarEventData} from '../../models/calendar-event-data.model';
import {
  CalendarConfig,
  DEFAULT_CALENDAR_CONFIG,
  HourRow,
  resolveCalendarConfig
} from '../../models/calendar-config.model';
import {CalendarDateFormatter} from '../../services/calendar-date-formatter';
import {DefaultCalendarDateFormatter} from '../../services/default-calendar-date-formatter';
import {CalendarEventLayoutService} from '../../services/calendar-event-layout.service';
import {CalendarUtility} from '../../utils/calendar-utils';
import {CalendarEventComponent} from '../calendar-event/calendar-event.component';

/** Extended hour row with a pre-resolved display label. */
type DisplayHourRow = {
  hourLabel: string;
} & HourRow

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
})
export class CalendarDayComponent implements OnInit, OnDestroy {
  private layoutService = inject(CalendarEventLayoutService);
  private cdr = inject(ChangeDetectorRef);

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
    this.resolvedConfig = this.config ? resolveCalendarConfig(this.config) : { ...DEFAULT_CALENDAR_CONFIG };
    this.updateDayInfo();
    this.updateCurrentTime();
    this.currentTimeInterval = setInterval(() => this.updateCurrentTime(), 60000);

    if (this.eventsChanged) {
      this.eventsChanged.pipe(takeUntil(this.destroy$)).subscribe(events => {
        this.events = events;
        this.refreshEvents();
        this.cdr.markForCheck();
      });
    }

    if (this.focusDayChanged) {
      this.focusDayChanged.pipe(takeUntil(this.destroy$)).subscribe(date => {
        this.focusDay = date;
        this.updateDayInfo();
        this.refreshEvents();
        this.updateCurrentTime();
        this.cdr.markForCheck();
      });
    }

    // Build hour rows asynchronously (formatTimeI returns a Promise).
    this.buildHourRows().then(() => this.cdr.markForCheck());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.currentTimeInterval) clearInterval(this.currentTimeInterval);
  }

  /** Returns the CSS `grid-row` value for an event. */
  getEventRow(event: CalendarEvent): string {
    const startRow = CalendarUtility.getCorrectRow(
      event.startTime.getHours(), event.startTime.getMinutes(), this.resolvedConfig.startHour
    );
    const endRow = CalendarUtility.getCorrectRow(
      event.endTime.getHours(), event.endTime.getMinutes(), this.resolvedConfig.startHour
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
        hourLabel: label
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

    const filtered = this.events.filter(e =>
      this.layoutService.eventsOverlap(e.startTime, e.endTime, rangeStart, rangeEnd)
    );

    this.displayEvents = this.layoutService.calculateMultiDayEvents(
      filtered, this.resolvedConfig.startHour, this.resolvedConfig.endHour, rangeStart, rangeEnd
    );

    this.layoutService.assignColumnsToEvents(this.displayEvents);
    this.layoutService.assignWidthsToEvents(this.displayEvents, rangeStart, rangeEnd);

    this.totalColumns = this.displayEvents.reduce((max, e) => Math.max(max, (e.column ?? 0) + (e.width ?? 1)), 1);
  }

  /** Updates the current-time red line position. */
  private updateCurrentTime() {
    const now = new Date();
    if (this.focusDay && this.formatter.isSameDay(this.focusDay, now)) {
      this.currentTimeRow = CalendarUtility.getCorrectRow(now.getHours(), now.getMinutes(), this.resolvedConfig.startHour);
      this.isToday = true;
      // formatTime is async; refresh the label and re-render when it resolves.
      this.formatter.formatTime(now).then(label => {
        this.currentTimeLabel = label;
        this.cdr.markForCheck();
      });
    } else {
      this.currentTimeRow = 0;
      this.isToday = false;
      this.currentTimeLabel = '';
    }
  }
}
