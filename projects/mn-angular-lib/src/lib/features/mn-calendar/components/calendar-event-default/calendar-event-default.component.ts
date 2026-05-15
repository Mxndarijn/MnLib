import { Component, Inject, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEventData } from '../../models/calendar-event-data.model';
import { CalendarEvent } from '../../models/calendar-event.model';
import { CALENDAR_DATE_FORMATTER, CalendarDateFormatter } from '../../services/calendar-date-formatter';
import { DefaultCalendarDateFormatter } from '../../services/default-calendar-date-formatter';

/**
 * Default event renderer used when no custom component is provided.
 *
 * Displays the event title, formatted time range, and optional description
 * with the event's colour scheme applied as background and left-border accent.
 */
@Component({
  selector: 'app-calendar-event-default',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-event-default.component.html',
  styles: [`
    .calendar-event-default {
      padding: 4px 8px;
      border-left: 3px solid #3b82f6;
      border-radius: 4px;
      font-size: 12px;
      height: 100%;
      overflow: hidden;
      cursor: pointer;
    }
    .event-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .event-time {
      font-size: 11px;
      opacity: 0.8;
    }
    .event-description {
      font-size: 11px;
      opacity: 0.7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class CalendarEventDefaultComponent implements CalendarEventData, OnInit {
  /** The event to render. Set by {@link CalendarEventComponent} after creation. */
  event!: CalendarEvent;
  formattedTime = '';

  private formatter: CalendarDateFormatter;

  constructor(
    @Optional() @Inject(CALENDAR_DATE_FORMATTER) formatter: CalendarDateFormatter | null
  ) {
    this.formatter = formatter ?? new DefaultCalendarDateFormatter();
  }

  async ngOnInit() {
    if (this.event) {
      const start = await this.formatter.formatTime(this.event.startTime);
      const end = await this.formatter.formatTime(this.event.endTime);
      this.formattedTime = `${start} - ${end}`;
    }
  }
}
