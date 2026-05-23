import { Component, Input, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CalendarEvent } from '../../models/calendar-event.model';
import { CalendarConfig, DEFAULT_CALENDAR_CONFIG, resolveCalendarConfig } from '../../models/calendar-config.model';
import { UpcomingEventRowComponent } from '../upcoming-event-row/upcoming-event-row.component';

/**
 * Sidebar component that lists the next 10 upcoming events
 * (events whose end time is in the future), sorted by start time.
 */
@Component({
  selector: 'app-upcoming-events',
  standalone: true,
  imports: [CommonModule, UpcomingEventRowComponent],
  templateUrl: './upcoming-events.component.html',
  styles: [`
    .upcoming-events {
      padding: 16px;
    }
    .upcoming-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .no-events {
      color: var(--color-base-content, #9ca3af); opacity: 0.5;
      font-size: 14px;
    }
  `]
})
export class UpcomingEventsComponent implements OnInit, OnDestroy {
  /** Observable that emits the full event list whenever it changes. */
  @Input() eventsChanged!: Observable<CalendarEvent[]>;
  /** Resolved calendar configuration passed from the parent view. */
  @Input() config?: CalendarConfig;
  /** Emits when an upcoming event row is clicked. */
  @Output() eventClicked = new EventEmitter<CalendarEvent>();

  upcomingEvents: CalendarEvent[] = [];
  title: string;
  noEventsMessage: string;

  private destroy$ = new Subject<void>();

  constructor() {
    this.title = DEFAULT_CALENDAR_CONFIG.upcomingEventsTitle;
    this.noEventsMessage = DEFAULT_CALENDAR_CONFIG.noUpcomingEvents;
  }

  ngOnInit() {
    const resolved = this.config ? resolveCalendarConfig(this.config) : { ...DEFAULT_CALENDAR_CONFIG };
    this.title = resolved.upcomingEventsTitle;
    this.noEventsMessage = resolved.noUpcomingEvents;

    if (this.eventsChanged) {
      this.eventsChanged.pipe(takeUntil(this.destroy$)).subscribe(events => {
        const now = new Date();
        this.upcomingEvents = events
          .filter(e => e.endTime > now)
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
          .slice(0, 10);
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** trackBy for upcoming event rows. */
  trackByEvent(_index: number, event: CalendarEvent): string {
    return event.id;
  }
}
