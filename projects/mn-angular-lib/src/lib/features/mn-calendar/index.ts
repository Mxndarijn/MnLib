// Main component
export { CalendarViewComponent } from './components/calendar-view/calendar-view.component';

// Sub-components
export { CalendarWeekComponent } from './components/calendar-week/calendar-week.component';
export { CalendarDayComponent } from './components/calendar-day/calendar-day.component';
export { CalendarMonthComponent } from './components/calendar-month/calendar-month.component';
export { CalendarEventComponent } from './components/calendar-event/calendar-event.component';
export { CalendarEventDefaultComponent } from './components/calendar-event-default/calendar-event-default.component';
export { UpcomingEventsComponent } from './components/upcoming-events/upcoming-events.component';
export { UpcomingEventRowComponent } from './components/upcoming-event-row/upcoming-event-row.component';

// Models
export type { CalendarEvent, CurrentTimeCalendarEvent } from './models/calendar-event.model';
export type { CalendarEventData } from './models/calendar-event-data.model';
export { CalendarView, CALENDAR_CONFIG, DEFAULT_CALENDAR_CONFIG, MN_CALENDAR_CONFIG, MN_CALENDAR_COMPONENT_NAME, provideMnCalendarConfig, resolveCalendarConfig } from './models/calendar-config.model';
export type { CalendarConfig, HourRow, ColumnDay, MonthItem } from './models/calendar-config.model';
export type { ColorPreset } from './models/color-preset.model';

// Services / Tokens
export { CALENDAR_DATE_FORMATTER } from './services/calendar-date-formatter';
export type { CalendarDateFormatter } from './services/calendar-date-formatter';
export { DefaultCalendarDateFormatter } from './services/default-calendar-date-formatter';
export { CalendarEventLayoutService } from './services/calendar-event-layout.service';

// Utility
export { CalendarUtility } from './utils/calendar-utils';
