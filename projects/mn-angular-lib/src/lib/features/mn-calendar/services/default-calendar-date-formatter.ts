import {Injectable, inject} from '@angular/core';
import { Observable, of } from 'rxjs';
import { CalendarDateFormatter } from './calendar-date-formatter';
import { CALENDAR_CONFIG, CalendarConfig, DEFAULT_CALENDAR_CONFIG } from '../models/calendar-config.model';

/**
 * Default implementation of {@link CalendarDateFormatter} that uses the
 * browser's `Intl.DateTimeFormat` API for locale-aware formatting.
 *
 * The locale is read from the injected {@link CALENDAR_CONFIG}. If no config
 * is provided, `'en-US'` is used as the fallback.
 *
 * This service has no dependency on `@ngx-translate` or any other i18n library,
 * so the calendar library works out of the box. Consumers can replace it with
 * their own implementation via the `CALENDAR_DATE_FORMATTER` injection token.
 */
@Injectable()
export class DefaultCalendarDateFormatter implements CalendarDateFormatter {
  private readonly locale: string;

  constructor() {
    const config = inject<CalendarConfig | null>(CALENDAR_CONFIG, {optional: true});

    this.locale = config?.locale ?? DEFAULT_CALENDAR_CONFIG.locale;
  }

  /** Formats an hour and minute pair into a locale time string (e.g. "09:00 AM"). */
  formatTimeI(hour: number, minute: number): Promise<string> {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return Promise.resolve(
      date.toLocaleTimeString(this.locale, { hour: '2-digit', minute: '2-digit' })
    );
  }

  /** Formats the time portion of a Date (e.g. "2:30 PM"). Returns empty string for undefined. */
  formatTime(date: Date | undefined): Promise<string> {
    if (!date) return Promise.resolve('');
    return Promise.resolve(
      date.toLocaleTimeString(this.locale, { hour: '2-digit', minute: '2-digit' })
    );
  }

  /** Formats a Date as a full date-time string (e.g. "May 15, 2026, 02:30 PM"). */
  formatDateTime(date: Date): Observable<string> {
    return of(
      date.toLocaleString(this.locale, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    );
  }

  /** Formats a Date as a date-only string (e.g. "May 15, 2026"). */
  formatDate(date: Date): Observable<string> {
    return of(
      date.toLocaleDateString(this.locale, {
        year: 'numeric', month: 'short', day: 'numeric'
      })
    );
  }

  /** Formats a Date as `YYYY-MM-DD` for use in `<input type="date">` controls. */
  formatDateForFormControl(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Returns `true` if both dates fall on the same calendar day. */
  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear()
      && date1.getMonth() === date2.getMonth()
      && date1.getDate() === date2.getDate();
  }

  /** Formats a Date as "Month Year" (e.g. "January 2026"). */
  formatMonthName(date: Date): Promise<string> {
    return Promise.resolve(
      date.toLocaleString(this.locale, { month: 'long', year: 'numeric' })
    );
  }
}
