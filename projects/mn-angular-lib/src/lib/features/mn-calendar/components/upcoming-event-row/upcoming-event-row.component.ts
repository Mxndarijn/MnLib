import { Component, Inject, Input, OnInit, Optional, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../models/calendar-event.model';
import { CALENDAR_DATE_FORMATTER, CalendarDateFormatter } from '../../services/calendar-date-formatter';
import { DefaultCalendarDateFormatter } from '../../services/default-calendar-date-formatter';

/**
 * Renders a single row in the upcoming-events sidebar.
 * Shows the event title, formatted date/time, and optional description.
 */
@Component({
  selector: 'app-upcoming-event-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-event-row.component.html',
  styles: [`
    .upcoming-event-row {
      padding: 8px 12px;
      border-left: 3px solid #3b82f6;
      margin-bottom: 8px;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .upcoming-event-row:hover { background: #f9fafb; }
    .event-title { font-weight: 600; font-size: 13px; }
    .event-time { font-size: 12px; color: #6b7280; }
    .event-description { font-size: 12px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `]
})
export class UpcomingEventRowComponent implements OnInit {
  /** The event to display. */
  @Input() event!: CalendarEvent;
  /** Emits the event when this row is clicked. */
  @Output() eventClicked = new EventEmitter<CalendarEvent>();

  formattedDate = '';

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
      this.formattedDate = `${start} - ${end}`;
    }
  }
}
