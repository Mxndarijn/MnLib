import { Type } from '@angular/core';
import { ColorPreset } from './color-preset.model';
import { MnButtonTypes } from '../../mn-button/mn-buttonTypes';

/**
 * Represents a single calendar event.
 *
 * Consumer-facing properties (`id` through `data`) are set by the application.
 * Layout properties (`column`, `width`, `continued`, `continuedEnd`) are
 * computed by {@link CalendarEventLayoutService} and should not be set manually.
 */
export type CalendarEvent = {
  /** Unique identifier for the event. */
  id: string;
  /** Display title. */
  title: string;
  /** Optional description shown below the title. */
  description: string;
  /** Event start date/time. */
  startTime: Date;
  /** Event end date/time. */
  endTime: Date;
  /** Colour scheme used for rendering. */
  color: ColorPreset;
  /** Optional custom component type to render this event (overrides the default renderer). */
  component?: Type<unknown>;
  /** Arbitrary payload attached to the event (passed through to custom renderers). */
  data?: unknown;

  // ── Layout properties (set by CalendarEventLayoutService) ──

  /** Zero-based column index within overlapping event groups. */
  column?: number;
  /** Number of sub-columns this event spans. */
  width?: number;
  /** `true` when this segment is a continuation from a previous day (multi-day events). */
  continued?: boolean;
  /** `true` when this segment continues into the next day (multi-day events). */
  continuedEnd?: boolean;
}

/**
 * Represents a button displayed in the calendar toolbar's top-right area.
 */
export type CalendarButton = {
  /** Display label for the button. */
  label: string;
  /** Button styling configuration passed to the mnButton directive. */
  buttonData?: Partial<MnButtonTypes>;
  /** Callback invoked when the button is clicked. */
  onClick: () => void;
}

/**
 * Represents the "current time" indicator rendered as a line in week/day views.
 */
export type CurrentTimeCalendarEvent = {
  id: 'current-time';
  title: string;
  startTime: Date;
  endTime: Date;
  column: number;
  width: number;
}
