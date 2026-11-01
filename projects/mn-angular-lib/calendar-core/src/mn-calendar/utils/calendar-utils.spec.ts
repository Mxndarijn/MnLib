import { CalendarUtility } from './calendar-utils';

describe('CalendarUtility', () => {
  describe('getCorrectRow', () => {
    it('maps the start hour to row 1', () => {
      expect(CalendarUtility.getCorrectRow(7, 0, 7)).toBe(1);
    });

    it('still clamps times before startHour to row 1 for event layout', () => {
      expect(CalendarUtility.getCorrectRow(3, 37, 7)).toBe(1);
    });
  });

  describe('getCurrentTimeRow', () => {
    it('hides the now-marker before startHour (l2tTCjLe)', () => {
      // Pre-07:00 used to clamp onto the 07:00 row with a live 03:37 badge.
      expect(CalendarUtility.getCurrentTimeRow(3, 37, 7, 22)).toBe(0);
      expect(CalendarUtility.getCurrentTimeRow(6, 59, 7, 22)).toBe(0);
    });

    it('hides the now-marker at or after endHour', () => {
      expect(CalendarUtility.getCurrentTimeRow(22, 0, 7, 22)).toBe(0);
      expect(CalendarUtility.getCurrentTimeRow(13, 0, 7, 13)).toBe(0);
    });

    it('places the marker on the correct row inside the window', () => {
      expect(CalendarUtility.getCurrentTimeRow(7, 0, 7, 22)).toBe(1);
      expect(CalendarUtility.getCurrentTimeRow(7, 30, 7, 22)).toBe(2);
      expect(CalendarUtility.getCurrentTimeRow(8, 0, 7, 22)).toBe(3);
    });
  });
});
