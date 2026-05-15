import { Injectable } from '@angular/core';
import { CalendarEvent } from '../models/calendar-event.model';

/**
 * Service that computes the visual layout of calendar events within a
 * time-grid (week or day view).
 *
 * Responsibilities:
 * - Splitting multi-day events into per-day segments.
 * - Assigning non-overlapping column indices to concurrent events.
 * - Computing the width (column span) each event should occupy.
 *
 * This service is stateless — all state is passed via method parameters.
 * Provide it per-component (not root) so each view gets its own instance.
 */
@Injectable()
export class CalendarEventLayoutService {

  /**
   * Returns `true` when two time ranges overlap (exclusive boundaries).
   */
  eventsOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
    return startA < endB && startB < endA;
  }

  /**
   * Returns all events whose time range overlaps the given `[start, end)` window.
   */
  getAllEventsOnSpecificTime(events: CalendarEvent[], start: Date, end: Date): CalendarEvent[] {
    return events.filter(e =>
      this.eventsOverlap(e.startTime, e.endTime, start, end)
    );
  }

  /**
   * Splits multi-day events into per-day segments that fit within the
   * visible hour range (`startHour`–`endHour`) and date range.
   *
   * Single-day events are shallow-copied as-is. Multi-day events produce
   * one segment per day with `continued` / `continuedEnd` flags set.
   */
  calculateMultiDayEvents(
    events: CalendarEvent[],
    startHour: number,
    endHour: number,
    rangeStart: Date,
    rangeEnd: Date
  ): CalendarEvent[] {
    const result: CalendarEvent[] = [];

    for (const event of events) {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      if (eventStart.toDateString() === eventEnd.toDateString()) {
        result.push({ ...event });
        continue;
      }

      const current = new Date(eventStart);
      let isFirst = true;

      while (current < eventEnd && current < rangeEnd) {
        if (current >= rangeStart) {
          const dayStart = new Date(current);
          const dayEnd = new Date(current);

          if (isFirst) {
            dayEnd.setHours(endHour, 0, 0, 0);
          } else {
            dayStart.setHours(startHour, 0, 0, 0);
            if (current.toDateString() === eventEnd.toDateString()) {
              dayEnd.setHours(eventEnd.getHours(), eventEnd.getMinutes(), 0, 0);
            } else {
              dayEnd.setHours(endHour, 0, 0, 0);
            }
          }

          result.push({
            ...event,
            startTime: isFirst ? eventStart : dayStart,
            endTime: current.toDateString() === eventEnd.toDateString() ? eventEnd : dayEnd,
            continued: !isFirst,
            continuedEnd: current.toDateString() !== eventEnd.toDateString()
          });
        }

        isFirst = false;
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
      }
    }

    return result;
  }

  /**
   * Assigns a zero-based `column` index to each event so that overlapping
   * events occupy different columns.
   *
   * Events are processed in start-time order (longest duration first for ties).
   * Each event gets the earliest column not already occupied by an overlapping event.
   */
  assignColumnsToEvents(events: CalendarEvent[]): void {
    const sorted = [...events].sort((a, b) => {
      const diff = a.startTime.getTime() - b.startTime.getTime();
      if (diff !== 0) return diff;
      return (b.endTime.getTime() - b.startTime.getTime()) - (a.endTime.getTime() - a.startTime.getTime());
    });

    for (const event of sorted) {
      event.column = this.findEarliestPossibleColumn(event, sorted);
    }
  }

  /**
   * Assigns a `width` (column span) to each event, expanding it to fill
   * unused columns to its right within the overlapping group.
   */
  assignWidthsToEvents(events: CalendarEvent[], scanStart: Date, scanEnd: Date): void {
    for (const event of events) {
      const overlapping = this.getAllEventsOnSpecificTime(events, event.startTime, event.endTime);
      const maxCol = Math.max(...overlapping.map(e => e.column ?? 0));
      const biggestPossible = this.findBiggestPossibleWidth(event, events, scanStart, scanEnd);
      event.width = Math.max(1, biggestPossible);

      if ((event.column ?? 0) + event.width > maxCol + 1) {
        event.width = maxCol + 1 - (event.column ?? 0);
      }
      if (event.width < 1) event.width = 1;
    }
  }

  /** Finds the lowest column index not occupied by any overlapping event. */
  private findEarliestPossibleColumn(event: CalendarEvent, allEvents: CalendarEvent[]): number {
    const overlapping = allEvents.filter(e =>
      e !== event
      && e.column !== undefined
      && this.eventsOverlap(e.startTime, e.endTime, event.startTime, event.endTime)
    );

    let column = 0;
    while (overlapping.some(e => e.column === column)) {
      column++;
    }
    return column;
  }

  /** Computes the maximum width an event can span without overlapping a neighbour to its right. */
  private findBiggestPossibleWidth(
    event: CalendarEvent,
    allEvents: CalendarEvent[],
    _scanStart: Date,
    _scanEnd: Date
  ): number {
    const overlapping = this.getAllEventsOnSpecificTime(allEvents, event.startTime, event.endTime);
    const maxCol = Math.max(...overlapping.map(e => e.column ?? 0));
    const totalColumns = maxCol + 1;

    const occupiedCols = overlapping
      .filter(e => e !== event && (e.column ?? 0) > (event.column ?? 0))
      .map(e => e.column ?? 0);

    if (occupiedCols.length === 0) {
      return totalColumns - (event.column ?? 0);
    }

    return Math.min(...occupiedCols) - (event.column ?? 0);
  }
}
