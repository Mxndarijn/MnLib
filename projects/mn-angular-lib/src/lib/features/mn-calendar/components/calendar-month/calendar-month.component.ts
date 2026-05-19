import { Component, Input, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CalendarEvent } from '../../models/calendar-event.model';
import { CalendarConfig, DEFAULT_CALENDAR_CONFIG, MonthItem, resolveCalendarConfig } from '../../models/calendar-config.model';
import { CalendarDateFormatter } from '../../services/calendar-date-formatter';
import { DefaultCalendarDateFormatter } from '../../services/default-calendar-date-formatter';

/**
 * Month grid view showing a 7×6 grid of day cells.
 *
 * Each cell displays the day number and up to 3 coloured dots representing
 * events on that day. Clicking a cell emits `dayClicked`.
 */
@Component({
  selector: 'app-calendar-month',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-month.component.html',
  styles: [`
    .calendar-month { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .month-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-weight: 600;
      font-size: 13px;
      padding: 8px 0;
      border-bottom: 1px solid var(--color-base-300);
    }
    .month-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-template-rows: repeat(6, 1fr);
      flex: 1;
      min-height: 0;
    }
    .month-cell {
      min-height: 0;
      padding: 4px 8px;
      border: 1px solid var(--color-base-200);
      cursor: pointer;
      transition: background 0.15s;
    }
    .month-cell:hover { background: var(--color-base-200); }
    .month-cell.other-month { opacity: 0.4; }
    .month-cell.today .day-number {
      background: var(--color-primary);
      color: var(--color-primary-content, white);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .day-number { font-size: 13px; font-weight: 500; }
    .month-events { display: flex; gap: 2px; flex-wrap: wrap; margin-top: 4px; }
    .month-event-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .more-events { font-size: 10px; color: var(--color-base-content, #6b7280); opacity: 0.6; }
  `]
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
  longDayNames: string[];

  private events: CalendarEvent[] = [];
  private destroy$ = new Subject<void>();
  private formatter: CalendarDateFormatter;

  constructor() {
    this.formatter = new DefaultCalendarDateFormatter();
    this.longDayNames = DEFAULT_CALENDAR_CONFIG.longDayNames;
  }

  ngOnInit() {
    const resolved = this.config ? resolveCalendarConfig(this.config) : { ...DEFAULT_CALENDAR_CONFIG };
    this.longDayNames = resolved.longDayNames;
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

  /** Builds the 42-cell month grid (6 rows × 7 columns). */
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
