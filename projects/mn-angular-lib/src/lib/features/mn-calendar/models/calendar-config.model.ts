import { InjectionToken } from '@angular/core';
import { CalendarEvent } from './calendar-event.model';
import { provideMnComponentConfig } from '../../../config/mn-component-config.providers';

/**
 * Available calendar view modes.
 */
export enum CalendarView {
  MONTH = 'MONTH',
  WEEK = 'WEEK',
  DAY = 'DAY'
}

/**
 * Configuration for the calendar component.
 * All properties are optional — sensible defaults are provided.
 * Can be supplied via the `CALENDAR_CONFIG` injection token or through
 * the `provideMnComponentConfig` helper using component name `'mn-calendar'`.
 */
export interface CalendarConfig {
  /** First visible hour in week/day views (0–23). Default: `7`. */
  startHour: number;
  /** Last visible hour in week/day views (1–24, exclusive). Default: `22`. */
  endHour: number;
  /** BCP 47 locale tag used for date/time formatting (e.g. `'en-US'`, `'nl-NL'`). Default: `'en-US'`. */
  locale: string;
  /** Label for the "Today" navigation button. Default: `'Today'`. */
  todayLabel: string;
  /** Title shown above the upcoming-events sidebar. Default: `'Upcoming events'`. */
  upcomingEventsTitle: string;
  /** Display labels for each calendar view mode. */
  viewLabels: Record<string, string>;
  /** Abbreviated day names starting from Monday (length 7). Derived from `locale` when not set. */
  shortDayNames: string[];
  /** Full day names starting from Monday (length 7). Derived from `locale` when not set. */
  longDayNames: string[];
  /** Screen-width breakpoint (px) below which only day view is shown. Default: `768`. */
  mobileBreakpoint: number;
}

/**
 * Builds locale-derived day name arrays from a BCP 47 locale string.
 * Uses January 1 2024 (a Monday) as the reference date.
 */
function buildDayNames(locale: string): { short: string[]; long: string[] } {
  const base = new Date(2024, 0, 1); // 2024-01-01 is a Monday
  const short: string[] = [];
  const long: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    short.push(d.toLocaleDateString(locale, { weekday: 'short' }));
    long.push(d.toLocaleDateString(locale, { weekday: 'long' }));
  }
  return { short, long };
}

/** Default calendar configuration values. */
export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = (() => {
  const locale = 'en-US';
  const names = buildDayNames(locale);
  return {
    startHour: 7,
    endHour: 22,
    locale,
    todayLabel: 'Today',
    upcomingEventsTitle: 'Upcoming events',
    viewLabels: { MONTH: 'Month', WEEK: 'Week', DAY: 'Day' },
    shortDayNames: names.short,
    longDayNames: names.long,
    mobileBreakpoint: 768,
  };
})();

/**
 * Injection token for the resolved calendar configuration.
 *
 * Prefer using {@link MN_CALENDAR_CONFIG} with `provideMnComponentConfig`
 * so that settings can be managed via `mn-config.json5`. This token is
 * kept for backward compatibility and manual `providers` usage.
 *
 * @example
 * ```ts
 * providers: [
 *   { provide: CALENDAR_CONFIG, useValue: { startHour: 8, endHour: 20, locale: 'nl-NL' } }
 * ]
 * ```
 */
export const CALENDAR_CONFIG = new InjectionToken<CalendarConfig>('CalendarConfig', {
  providedIn: 'root',
  factory: () => DEFAULT_CALENDAR_CONFIG
});

/**
 * Injection token resolved via `MnConfigService` (the `mn-config.json5` system).
 *
 * Use the helper {@link provideMnCalendarConfig} in the component's `providers`
 * array so that calendar settings are read from the config file and support
 * `$translate` markers, section scoping, and instance-id overrides.
 *
 * Component name in the config file: `'mn-calendar'`.
 *
 * @example
 * ```json5
 * // mn-config.json5
 * {
 *   defaults: {
 *     "mn-calendar": {
 *       startHour: 8,
 *       endHour: 20,
 *       locale: "nl-NL",
 *       todayLabel: { $translate: "calendar.today" }
 *     }
 *   }
 * }
 * ```
 */
export const MN_CALENDAR_CONFIG = new InjectionToken<CalendarConfig>('MN_CALENDAR_CONFIG');

/** Component name used to look up calendar settings in `mn-config.json5`. */
export const MN_CALENDAR_COMPONENT_NAME = 'mn-calendar';

/**
 * Provider helper that wires the calendar into the `mn-config` system.
 *
 * Add this to the `providers` array of the component (or module) that hosts
 * `<app-calendar-view>`. It reads defaults and overrides from `mn-config.json5`
 * under the key `"mn-calendar"` and provides them via {@link MN_CALENDAR_CONFIG}.
 *
 * @param initial — optional partial defaults merged before config-file values.
 */
export function provideMnCalendarConfig(initial?: Partial<CalendarConfig>) {
  return provideMnComponentConfig<CalendarConfig>(MN_CALENDAR_CONFIG, MN_CALENDAR_COMPONENT_NAME, initial);
}

/**
 * Merges a partial config with defaults, re-deriving day names from locale when needed.
 */
export function resolveCalendarConfig(partial?: Partial<CalendarConfig>): CalendarConfig {
  if (!partial) return { ...DEFAULT_CALENDAR_CONFIG };
  const locale = partial.locale ?? DEFAULT_CALENDAR_CONFIG.locale;
  const names = buildDayNames(locale);
  return {
    ...DEFAULT_CALENDAR_CONFIG,
    ...partial,
    locale,
    shortDayNames: partial.shortDayNames ?? names.short,
    longDayNames: partial.longDayNames ?? names.long,
  };
}

/**
 * Represents a half-hour row in the week/day time grid.
 */
export interface HourRow {
  /** The hour value (e.g. 7, 8, …). */
  hour: number;
  /** CSS grid row start (1-based). */
  topRow: number;
  /** CSS grid row end (1-based, exclusive). */
  bottomRow: number;
}

/**
 * Represents a single day column in the week view header.
 */
export interface ColumnDay {
  /** The date this column represents. */
  date: Date;
  /** Abbreviated day name (e.g. "Mon"). */
  dayName: string;
  /** Day-of-month number (1–31). */
  dayNumber: number;
  /** Whether this column is today. */
  isToday: boolean;
}

/**
 * Represents a single cell in the month grid.
 */
export interface MonthItem {
  /** The date this cell represents. */
  date: Date;
  /** Day-of-month number (1–31). */
  dayNumber: number;
  /** Whether this date belongs to the currently focused month. */
  isCurrentMonth: boolean;
  /** Whether this date is today. */
  isToday: boolean;
  /** Events occurring on this date. */
  events: CalendarEvent[];
}
