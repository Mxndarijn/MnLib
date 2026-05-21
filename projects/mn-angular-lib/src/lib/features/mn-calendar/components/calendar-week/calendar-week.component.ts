import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit, Output, EventEmitter, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CalendarEvent } from '../../models/calendar-event.model';
import { CalendarEventData } from '../../models/calendar-event-data.model';
import { CalendarConfig, ColumnDay, DEFAULT_CALENDAR_CONFIG, HourRow, resolveCalendarConfig } from '../../models/calendar-config.model';
import { CalendarDateFormatter } from '../../services/calendar-date-formatter';
import { DefaultCalendarDateFormatter } from '../../services/default-calendar-date-formatter';
import { CalendarEventLayoutService } from '../../services/calendar-event-layout.service';
import { CalendarUtility } from '../../utils/calendar-utils';
import { CalendarEventComponent } from '../calendar-event/calendar-event.component';

/** Extended hour row with a pre-resolved display label. */
interface DisplayHourRow extends HourRow {
  hourLabel: string;
}

/**
 * Week grid view showing 7 day columns with half-hour time slots.
 *
 * Overlapping events within the same day are laid out in sub-columns
 * so they appear side-by-side rather than stacked.
 */
@Component({
  selector: 'app-calendar-week',
  standalone: true,
  imports: [CommonModule, CalendarEventComponent],
  templateUrl: './calendar-week.component.html',
  providers: [CalendarEventLayoutService],
  styles: [`
    .calendar-week { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .week-header {
      display: grid;
      border-bottom: 1px solid var(--color-base-300);
    }
    .time-gutter-header { min-width: 60px; }
    .day-column-header {
      text-align: center;
      padding: 8px 4px;
      font-size: 13px;
    }
    .day-column-header.today { color: var(--color-primary); font-weight: 700; }
    .day-name { display: block; font-size: 11px; text-transform: uppercase; color: var(--color-base-content, #6b7280); opacity: 0.7; }
    .day-number { font-size: 18px; font-weight: 600; }
    .week-body { display: grid; grid-template-columns: 60px 1fr; flex: 1; min-height: 0; overflow: hidden; align-items: stretch; }
    .time-gutter {
      display: grid;
      height: 100%;
      min-height: 0;
    }
    .hour-label {
      font-size: 11px;
      color: var(--color-base-content, #6b7280); opacity: 0.7;
      text-align: right;
      padding-right: 8px;
      display: flex;
      align-items: start;
      min-height: 0;
      overflow: hidden;
    }
    .week-grid {
      display: grid;
      position: relative;
      grid-auto-rows: 1fr;
      height: 100%;
      min-height: 0;
    }
    .hour-line {
      border-top: 1px solid var(--color-base-200);
      pointer-events: none;
      min-height: 0;
    }
    .week-event {
      z-index: 1;
      padding: 1px 2px;
      overflow: hidden;
      min-height: 0;
    }
    .current-time-line {
      position: relative;
      z-index: 2;
      pointer-events: none;
    }
    .current-time-dot {
      width: 8px;
      height: 8px;
      background: var(--color-error, #ef4444);
      border-radius: 50%;
      position: absolute;
      left: -4px;
      top: -4px;
    }
    .current-time-rule {
      height: 2px;
      background: var(--color-error, #ef4444);
      width: 100%;
    }
  `]
})
export class CalendarWeekComponent implements OnInit, OnDestroy {
  /** The date around which the week is centred. */
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

  columns: ColumnDay[] = [];
  hourRows: DisplayHourRow[] = [];
  displayEvents: CalendarEvent[] = [];
  totalRows = 0;
  currentTimeRow = 0;
  currentTimeCol = '';
  gridTemplateColumns = 'repeat(7, 1fr)';

  private dayColumnMap: { subColumns: number; startCol: number }[] = [];
  private events: CalendarEvent[] = [];
  private destroy$ = new Subject<void>();
  private formatter: CalendarDateFormatter;
  private resolvedConfig!: CalendarConfig;
  private currentTimeInterval?: ReturnType<typeof setInterval>;

  constructor(
    private layoutService: CalendarEventLayoutService,
    private cdr: ChangeDetectorRef,
  ) {
    this.formatter = new DefaultCalendarDateFormatter();
  }

  ngOnInit() {
    this.resolvedConfig = this.config ? resolveCalendarConfig(this.config) : { ...DEFAULT_CALENDAR_CONFIG };
    this.buildColumns();
    this.updateCurrentTime();
    this.currentTimeInterval = setInterval(() => this.updateCurrentTime(), 60000);

    if (this.eventsChanged) {
      this.eventsChanged.pipe(takeUntil(this.destroy$)).subscribe(events => {
        this.events = events;
        this.refreshEvents();
      });
    }

    if (this.focusDayChanged) {
      this.focusDayChanged.pipe(takeUntil(this.destroy$)).subscribe(date => {
        this.focusDay = date;
        this.buildColumns();
        this.refreshEvents();
        this.updateCurrentTime();
      });
    }

    // Build hour rows asynchronously (formatTimeI returns a Promise).
    this.buildHourRows().then(() => this.cdr.detectChanges());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.currentTimeInterval) clearInterval(this.currentTimeInterval);
  }

  /** Returns the CSS `grid-row` value for an event based on its start/end times. */
  getEventRow(event: CalendarEvent): string {
    const startRow = CalendarUtility.getCorrectRow(
      event.startTime.getHours(), event.startTime.getMinutes(), this.resolvedConfig.startHour
    );
    const endRow = CalendarUtility.getCorrectRow(
      event.endTime.getHours(), event.endTime.getMinutes(), this.resolvedConfig.startHour
    );
    return `${startRow} / ${Math.max(endRow, startRow + 1)}`;
  }

  /** Returns the CSS `grid-column` span for a day header, accounting for sub-columns. */
  getHeaderColumn(dayIndex: number): string {
    if (!this.dayColumnMap.length) return `${dayIndex + 2} / span 1`;
    const dayInfo = this.dayColumnMap[dayIndex];
    return `${dayInfo.startCol + 1} / span ${dayInfo.subColumns}`;
  }

  /** Returns the CSS `grid-column` value for an event within its day's sub-columns. */
  getEventColumn(event: CalendarEvent): string {
    const dayIdx = this.columns.findIndex(c => this.formatter.isSameDay(c.date, event.startTime));
    if (dayIdx < 0) return '1 / span 1';
    const dayInfo = this.dayColumnMap[dayIdx];
    const subCol = (event.column ?? 0) + dayInfo.startCol;
    const width = event.width ?? 1;
    return `${subCol} / span ${width}`;
  }

  /** Forwards event click to parent. */
  onEventClick(event: CalendarEvent) {
    this.eventClicked.emit(event);
  }

  /** trackBy for hour rows. */
  trackByHour(_index: number, row: DisplayHourRow): number {
    return row.hour;
  }

  /** trackBy for day columns. */
  trackByColumn(_index: number, col: ColumnDay): number {
    return col.date.getTime();
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

  /** Builds the 7 day columns for the current week (Monday–Sunday). */
  private buildColumns() {
    if (!this.focusDay) return;

    const shortNames = this.resolvedConfig.shortDayNames;
    const today = new Date();

    const day = this.focusDay.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(this.focusDay);
    monday.setDate(this.focusDay.getDate() + mondayOffset);

    this.columns = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      this.columns.push({
        date,
        dayName: shortNames[i],
        dayNumber: date.getDate(),
        isToday: this.formatter.isSameDay(date, today)
      });
    }
  }

  /** Filters, splits, and lays out events for the current week. */
  private refreshEvents() {
    if (!this.columns.length) return;

    const rangeStart = this.columns[0].date;
    const rangeEnd = new Date(this.columns[6].date);
    rangeEnd.setHours(23, 59, 59, 999);

    const filtered = this.events.filter(e =>
      this.layoutService.eventsOverlap(e.startTime, e.endTime, rangeStart, rangeEnd)
    );

    this.displayEvents = this.layoutService.calculateMultiDayEvents(
      filtered, this.resolvedConfig.startHour, this.resolvedConfig.endHour, rangeStart, rangeEnd
    );

    // Assign columns per day so overlapping events within a day get sub-columns
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(this.columns[i].date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(this.columns[i].date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = this.displayEvents.filter(e =>
        this.formatter.isSameDay(e.startTime, this.columns[i].date)
      );

      this.layoutService.assignColumnsToEvents(dayEvents);
      this.layoutService.assignWidthsToEvents(dayEvents, dayStart, dayEnd);
    }

    this.buildGridColumns();
    this.updateCurrentTime();
  }

  /** Computes the CSS grid-template-columns string based on per-day sub-column counts. */
  private buildGridColumns() {
    this.dayColumnMap = [];
    let currentCol = 1;

    for (let i = 0; i < 7; i++) {
      const dayEvents = this.displayEvents.filter(e =>
        this.formatter.isSameDay(e.startTime, this.columns[i].date)
      );

      let maxSubCols = 1;
      for (const e of dayEvents) {
        maxSubCols = Math.max(maxSubCols, (e.column ?? 0) + (e.width ?? 1));
      }

      this.dayColumnMap.push({ subColumns: maxSubCols, startCol: currentCol });
      currentCol += maxSubCols;
    }

    const parts: string[] = [];
    for (const day of this.dayColumnMap) {
      for (let j = 0; j < day.subColumns; j++) {
        parts.push(`${1 / day.subColumns}fr`);
      }
    }
    this.gridTemplateColumns = parts.join(' ');
  }

  /** Updates the current-time red line position. */
  private updateCurrentTime() {
    const now = new Date();
    const dayIdx = this.columns.findIndex(c => this.formatter.isSameDay(c.date, now));
    if (dayIdx >= 0 && this.dayColumnMap.length > 0) {
      const dayInfo = this.dayColumnMap[dayIdx];
      this.currentTimeCol = `${dayInfo.startCol} / span ${dayInfo.subColumns}`;
      this.currentTimeRow = CalendarUtility.getCorrectRow(now.getHours(), now.getMinutes(), this.resolvedConfig.startHour);
    } else {
      this.currentTimeCol = '';
      this.currentTimeRow = 0;
    }
  }
}
