import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Abstraction for date/time formatting used by calendar components.
 *
 * The library ships a default implementation ({@link DefaultCalendarDateFormatter})
 * that uses `Intl.DateTimeFormat`. Consumers can provide their own implementation
 * (e.g. wrapping `@ngx-translate`) via the {@link CALENDAR_DATE_FORMATTER} token.
 *
 * Locale-independent settings (day names, view labels, "Today" label) have been
 * moved to {@link CalendarConfig} so they can be configured declaratively.
 */
export interface CalendarDateFormatter {
  /** Formats an hour + minute pair (e.g. `9, 0` → `"09:00 AM"`). */
  formatTimeI(hour: number, minute: number): Promise<string>;
  /** Formats the time portion of a Date. Returns `''` for `undefined`. */
  formatTime(date: Date | undefined): Promise<string>;
  /** Formats a full date-time string as an Observable. */
  formatDateTime(date: Date): Observable<string>;
  /** Formats a date-only string as an Observable. */
  formatDate(date: Date): Observable<string>;
  /** Formats a Date as `YYYY-MM-DD` for `<input type="date">`. */
  formatDateForFormControl(date: Date): string;
  /** Returns `true` when both dates fall on the same calendar day. */
  isSameDay(date1: Date, date2: Date): boolean;
  /** Formats a Date as "Month Year" (e.g. "January 2026"). */
  formatMonthName(date: Date): Promise<string>;
}

/**
 * Injection token for the calendar date formatter.
 *
 * @example
 * ```ts
 * providers: [
 *   { provide: CALENDAR_DATE_FORMATTER, useClass: MyCustomFormatter }
 * ]
 * ```
 */
export const CALENDAR_DATE_FORMATTER = new InjectionToken<CalendarDateFormatter>('CalendarDateFormatter');
