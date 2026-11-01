/**
 * Static utility methods for calendar grid positioning.
 */
export class CalendarUtility {
  /**
   * Converts a weekday (from `Date.getDay()`) to a 1-based Monday-first column index.
   * Monday = 1, Tuesday = 2, …, Sunday = 7.
   */
  static getCorrectColumn(date: Date): number {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }

  /**
   * Converts an hour + minute pair to a 1-based CSS grid row index
   * within a half-hour grid starting at `startHour`.
   *
   * Each hour occupies two rows (one per 30-minute slot).
   * Formula: `(hour - startHour) * 2 + (minute >= 30 ? 1 : 0) + 1`
   *
   * Times before `startHour` clamp to row 1 so an event that began earlier still
   * paints from the top of the visible grid. For the now-marker use
   * {@link getCurrentTimeRow} instead — clamping there pinned a pre-open clock
   * on the first row (l2tTCjLe / s1DBWlDE).
   *
   * @returns Grid row number (minimum 1).
   */
  static getCorrectRow(hour: number, minute: number, startHour: number): number {
    const hourOffset = hour - startHour;
    const row = hourOffset * 2 + (minute >= 30 ? 1 : 0) + 1;
    return Math.max(1, row);
  }

  /**
   * Grid row for the live now-marker, or `0` (hide) when “now” is outside the
   * visible `[startHour, endHour)` window (l2tTCjLe / s1DBWlDE / G6pB4jWN family).
   * @param hour Local hour of day (0–23).
   * @param minute Local minute.
   * @param startHour Inclusive first visible hour.
   * @param endHour Exclusive last visible hour (grid ends when this hour begins).
   * @returns A positive row, or 0 to hide the marker.
   */
  static getCurrentTimeRow(
    hour: number,
    minute: number,
    startHour: number,
    endHour: number,
  ): number {
    const minutes = hour * 60 + minute;
    if (minutes < startHour * 60 || minutes >= endHour * 60) {
      return 0;
    }
    return CalendarUtility.getCorrectRow(hour, minute, startHour);
  }
}
