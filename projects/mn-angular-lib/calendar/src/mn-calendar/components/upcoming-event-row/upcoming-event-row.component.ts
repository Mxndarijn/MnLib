import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from 'mn-angular-lib/calendar-core';
import { CALENDAR_DATE_FORMATTER, CalendarDateFormatter } from 'mn-angular-lib/calendar-core';
import { DefaultCalendarDateFormatter } from 'mn-angular-lib/calendar-core';

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

  /** Marks the view when the awaited time string lands (see {@link ngOnInit}). */
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    const formatter = inject<CalendarDateFormatter | null>(CALENDAR_DATE_FORMATTER, {
      optional: true,
    });

    this.formatter = formatter ?? new DefaultCalendarDateFormatter();
  }

  async ngOnInit() {
    if (this.event) {
      const start = await this.formatter.formatTime(this.event.startTime);
      const end = await this.formatter.formatTime(this.event.endTime);
      this.formattedDate = `${start} - ${end}`;
      // The first render already happened with the empty string; nothing schedules a second
      // one for a value written after an await. Same fix as calendar-event-default.
      this.cdr.markForCheck();
    }
  }
}
