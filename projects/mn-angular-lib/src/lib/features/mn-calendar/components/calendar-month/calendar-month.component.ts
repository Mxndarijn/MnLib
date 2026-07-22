import { Component, Input, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CalendarEvent } from '../../models/calendar-event.model';
import { CalendarConfig, DEFAULT_CALENDAR_CONFIG, MonthItem, resolveCalendarConfig } from '../../models/calendar-config.model';
import { CalendarDateFormatter } from '../../services/calendar-date-formatter';
import { DefaultCalendarDateFormatter } from '../../services/default-calendar-date-formatter';

/**
 * Month grid view showing a 7Ã—6 grid of day cells.
 *
 * Each cell displays the day number and up to 3 coloured dots representing
 * events on that day. Clicking a cell emits `dayClicked`.
 */
@Component({
  selector: 'mn-calendar-month',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-month.component.html',
})
export class CalendarMonthComponent implements OnInit, OnDestroy {
  /** The date whose month is displayed. */
  @Input() focusDay!: Date;
  /** Observable that emits the full event list whenever it changes. */
  @Input() eventsChanged!: Observable<CalendarEvent[]>;
  /** Observable that emits when the focus day changes. */
  @Input() focusDayChanged!: Observable<Date>;
  /** Resolved calendar configuration passed from the parent view. */
  @Input() config?: CalendarConfig;
  /** Emits the date of a clicked day cell. */
  @Output() dayClicked = new EventEmitter<Date>();

  monthItems: MonthItem[] = [];
  /** Short weekday column headers (e.g. "Mon"), kept compact for the narrow columns. */
  weekdayLabels: string[];
  /** Word shown after the "+N" overflow count (e.g. "more"), from config. */
  moreEventsLabel = DEFAULT_CALENDAR_CONFIG.moreEventsLabel;

  private events: CalendarEvent[] = [];
  private destroy$ = new Subject<void>();
  private formatter: CalendarDateFormatter;

  constructor() {
    this.formatter = new DefaultCalendarDateFormatter();
    this.weekdayLabels = DEFAULT_CALENDAR_CONFIG.shortDayNames;
  }

  ngOnInit() {
    const resolved = this.config ? resolveCalendarConfig(this.config) : { ...DEFAULT_CALENDAR_CONFIG };
    this.weekdayLabels = resolved.shortDayNames;
    this.moreEventsLabel = resolved.moreEventsLabel;
    this.buildMonth();

    if (this.eventsChanged) {
      this.eventsChanged.pipe(takeUntil(this.destroy$)).subscribe(events => {
        this.events = events;
        this.buildMonth();
      });
    }

    if (this.focusDayChanged) {
      this.focusDayChanged.pipe(takeUntil(this.destroy$)).subscribe(date => {
        this.focusDay = date;
        this.buildMonth();
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Emits the clicked day's date. */
  onDayClick(date: Date) {
    this.dayClicked.emit(date);
  }

  /** trackBy for day name headers. */
  trackByDayName(index: number): number {
    return index;
  }

  /** trackBy for month grid cells. */
  trackByMonthItem(_index: number, item: MonthItem): number {
    return item.date.getTime();
  }

  /** trackBy for event dots. */
  trackByEventDot(_index: number, event: CalendarEvent): string {
    return event.id;
  }

  /** Builds the 42-cell month grid (6 rows Ã— 7 columns). */
  private buildMonth() {
    if (!this.focusDay) return;

    const year = this.focusDay.getFullYear();
    const month = this.focusDay.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const today = new Date();
    this.monthItems = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      this.monthItems.push(this.createMonthItem(date, false, today));
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      this.monthItems.push(this.createMonthItem(date, true, today));
    }

    const remaining = 42 - this.monthItems.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      this.monthItems.push(this.createMonthItem(date, false, today));
    }
  }

  private createMonthItem(date: Date, isCurrentMonth: boolean, today: Date): MonthItem {
    const isToday = this.formatter.isSameDay(date, today);
    const dayEvents = this.events.filter(e =>
      this.formatter.isSameDay(e.startTime, date) ||
      this.formatter.isSameDay(e.endTime, date) ||
      (e.startTime < date && e.endTime > date)
    );

    return {
      date,
      dayNumber: date.getDate(),
      isCurrentMonth,
      isToday,
      events: dayEvents
    };
  }
}
