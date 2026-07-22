import {ChangeDetectorRef, Component, OnInit, inject} from '@angular/core';
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
  selector: 'mn-calendar-event-default',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-event-default.component.html',
})
export class CalendarEventDefaultComponent implements CalendarEventData, OnInit {
  private cdr = inject(ChangeDetectorRef);

  /** The event to render. Set by {@link CalendarEventComponent} after creation. */
  event!: CalendarEvent;
  formattedTime = '';

  private formatter: CalendarDateFormatter;

  constructor() {
    const formatter = inject<CalendarDateFormatter | null>(CALENDAR_DATE_FORMATTER, {optional: true});

    this.formatter = formatter ?? new DefaultCalendarDateFormatter();
  }

  async ngOnInit() {
    if (this.event) {
      const start = await this.formatter.formatTime(this.event.startTime);
      const end = await this.formatter.formatTime(this.event.endTime);
      this.formattedTime = `${start} - ${end}`;
      this.cdr.markForCheck();
    }
  }
}
