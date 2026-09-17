import { CalendarEvent } from './calendar-event.model';

/**
 * Contract for pluggable event renderer components.
 *
 * Any component that implements this interface can be used as a custom
 * event template inside the calendar. Pass the component type via
 * `[CalendarEventComponent]` on `<mn-calendar-view>`.
 *
 * The calendar will set the `event` property after creating the component
 * dynamically via `ViewContainerRef.createComponent()`.
 */
export type CalendarEventData = {
  /** The calendar event to render. Set by the calendar after component creation. */
  event: CalendarEvent;
}
