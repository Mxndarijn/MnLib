/**
 * Public API of the `mn-angular-lib/calendar-core` entry point: calendar models, configuration tokens, date formatter and utilities, without any component.
 *
 * Each entry point is its own module in the published package, so a consumer's bundler
 * splits it into the chunk that uses it instead of loading the whole library at startup.
 * The root `mn-angular-lib` entry re-exports every entry point.
 */
// Models
export type { CalendarEvent, CurrentTimeCalendarEvent, CalendarButton } from './src/mn-calendar/models/calendar-event.model';
export type { CalendarEventData } from './src/mn-calendar/models/calendar-event-data.model';
export { CalendarView, CALENDAR_CONFIG, DEFAULT_CALENDAR_CONFIG, MN_CALENDAR_CONFIG, MN_CALENDAR_COMPONENT_NAME, provideMnCalendarConfig, resolveCalendarConfig } from './src/mn-calendar/models/calendar-config.model';
export type { CalendarConfig, HourRow, ColumnDay, MonthItem } from './src/mn-calendar/models/calendar-config.model';
export type { ColorPreset } from './src/mn-calendar/models/color-preset.model';

// Services / Tokens
export { CALENDAR_DATE_FORMATTER } from './src/mn-calendar/services/calendar-date-formatter';
export type { CalendarDateFormatter } from './src/mn-calendar/services/calendar-date-formatter';
export { DefaultCalendarDateFormatter } from './src/mn-calendar/services/default-calendar-date-formatter';
export { CalendarEventLayoutService } from './src/mn-calendar/services/calendar-event-layout.service';

// Utility
export { CalendarUtility } from './src/mn-calendar/utils/calendar-utils';
