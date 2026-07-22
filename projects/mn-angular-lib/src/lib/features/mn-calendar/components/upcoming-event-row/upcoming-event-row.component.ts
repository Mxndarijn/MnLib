import {Component, Input, OnInit, Output, EventEmitter, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../models/calendar-event.model';
import { CALENDAR_DATE_FORMATTER, CalendarDateFormatter } from '../../services/calendar-date-formatter';
import { DefaultCalendarDateFormatter } from '../../services/default-calendar-date-formatter';

/**
 * Renders a single row in the upcoming-events sidebar.
 * Shows the event title, formatted date/time, and optional description.
 */
@Component({
  selector: 'mn-upcoming-event-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-event-row.component.html',
})
export class UpcomingEventRowComponent implements OnInit {
  /** The event to display. */
  @Input() event!: CalendarEvent;
  /** Emits the event when this row is clicked. */
  @Output() eventClicked = new EventEmitter<CalendarEvent>();

  formattedDate = '';

  private formatter: CalendarDateFormatter;

  constructor() {
    const formatter = inject<CalendarDateFormatter | null>(CALENDAR_DATE_FORMATTER, {optional: true});

    this.formatter = formatter ?? new DefaultCalendarDateFormatter();
  }

  async ngOnInit() {
    if (this.event) {
      const start = await this.formatter.formatTime(this.event.startTime);
      const end = await this.formatter.formatTime(this.event.endTime);
      this.formattedDate = `${start} - ${end}`;
    }
  }
}
