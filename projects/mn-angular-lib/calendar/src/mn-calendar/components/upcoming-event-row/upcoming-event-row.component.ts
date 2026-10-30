import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  OnInit,
  Output,
  EventEmitter,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from 'mn-angular-lib/calendar-core';
import { CALENDAR_DATE_FORMATTER, CalendarDateFormatter } from 'mn-angular-lib/calendar-core';
import { DefaultCalendarDateFormatter } from 'mn-angular-lib/calendar-core';
import { MnLanguageService } from 'mn-angular-lib/core';
import { skip } from 'rxjs';

/**
 * Renders a single row in the upcoming-events sidebar.
 * Shows the event title, formatted date/time, and optional description.
 *
 * Times are reformatted whenever the `event` input changes and whenever the
 * locale changes: parents often reuse the row with `@for (…; track $index)`, so
 * formatting only in `ngOnInit` left stale times on the rail after a day switch.
 */
@Component({
  selector: 'mn-upcoming-event-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-event-row.component.html',
})
export class UpcomingEventRowComponent implements OnInit, OnChanges {
  /** The event to display. */
  @Input() event!: CalendarEvent;
  /** Emits the event when this row is clicked. */
  @Output() eventClicked = new EventEmitter<CalendarEvent>();

  formattedDate = '';

  private formatter: CalendarDateFormatter;

  /** Marks the view when the awaited time string lands (see {@link refreshFormattedDate}). */
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Bumps so an in-flight format from a previous event/locale is ignored. */
  private formatGeneration = 0;

  constructor() {
    const formatter = inject<CalendarDateFormatter | null>(CALENDAR_DATE_FORMATTER, {
      optional: true,
    });

    this.formatter = formatter ?? new DefaultCalendarDateFormatter();
  }

  ngOnInit() {
    const sub = this.lang.locale$.pipe(skip(1)).subscribe(() => {
      void this.refreshFormattedDate();
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
    void this.refreshFormattedDate();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['event'] && !changes['event'].firstChange) {
      void this.refreshFormattedDate();
    }
  }

  /**
   * Formats the current event's start/end times into {@link formattedDate}.
   * Generation-guarded so a slow format for an older event cannot overwrite a newer one.
   */
  private async refreshFormattedDate(): Promise<void> {
    const generation = ++this.formatGeneration;
    if (!this.event) {
      this.formattedDate = '';
      this.cdr.markForCheck();
      return;
    }
    const start = await this.formatter.formatTime(this.event.startTime);
    const end = await this.formatter.formatTime(this.event.endTime);
    if (generation !== this.formatGeneration) {
      return;
    }
    this.formattedDate = `${start} - ${end}`;
    // The first render already happened with the empty string; nothing schedules a second
    // one for a value written after an await. Same fix as calendar-event-default.
    this.cdr.markForCheck();
  }
}
