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
   * @returns Grid row number (minimum 1).
   */
  static getCorrectRow(hour: number, minute: number, startHour: number): number {
    const hourOffset = hour - startHour;
    const row = hourOffset * 2 + (minute >= 30 ? 1 : 0) + 1;
    return Math.max(1, row);
  }
}
