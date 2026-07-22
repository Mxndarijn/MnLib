import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';

import {CalendarViewComponent} from './calendar-view.component';
import {CalendarView} from '../../models/calendar-config.model';
import {MnLanguageService} from '../../../../language';

/** Minimal stub of MnLanguageService so the component needs no HttpClient. */
class LanguageStub {
  locale = 'en-US';
  locale$ = new BehaviorSubject<string>('en');
}

/** Wednesday 15 January 2025. Its week runs Mon 13 – Sun 19 January. */
const WEDNESDAY_15_JAN = new Date(2025, 0, 15);

describe('CalendarViewComponent', () => {
  let fixture: ComponentFixture<CalendarViewComponent>;
  let component: CalendarViewComponent;

  /** Builds the calendar focused on a given day in a given view. */
  async function createCalendar(view: CalendarView, focus = WEDNESDAY_15_JAN): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CalendarViewComponent],
      providers: [{provide: MnLanguageService, useClass: LanguageStub}],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarViewComponent);
    component = fixture.componentInstance;
    component.currentView = view;
    component.focusDay = focus;
    fixture.detectChanges();
  }

  // These specs exercise the desktop view logic (month/week switching, period
  // labels). Pin a desktop width so the responsive mobile breakpoint — which
  // forces day view on a narrow window — doesn't override the view under test on
  // whatever size the Karma browser happens to open at.
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1280});
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('navigating', () => {
    it('steps a day at a time in day view', async () => {
      await createCalendar(CalendarView.DAY);

      component.navigate(1);
      expect(component.focusDay.getDate()).toBe(16);

      component.navigate(-1);
      component.navigate(-1);
      expect(component.focusDay.getDate()).toBe(14);
    });

    it('steps a week at a time in week view', async () => {
      await createCalendar(CalendarView.WEEK);

      component.navigate(1);
      expect(component.focusDay.getDate()).toBe(22);

      component.navigate(-1);
      expect(component.focusDay.getDate()).toBe(15);
    });

    it('steps a month at a time in month view', async () => {
      await createCalendar(CalendarView.MONTH);

      component.navigate(1);
      expect(component.focusDay.getMonth()).toBe(1);
      expect(component.focusDay.getDate()).toBe(15);
    });

    it('does not overshoot a short month', async () => {
      // 31 January plus a month is 28 February — `setMonth` alone would land on
      // 3 March, silently skipping the month the user asked for.
      await createCalendar(CalendarView.MONTH, new Date(2025, 0, 31));

      component.navigate(1);
      expect(component.focusDay.getMonth()).toBe(1);
      expect(component.focusDay.getDate()).toBe(28);
    });

    it('asks for fresh events whenever the focus day moves', async () => {
      await createCalendar(CalendarView.DAY);
      const requested: Date[] = [];
      component.RequestNewCalendarItemsEvent.subscribe((d) => requested.push(d));

      component.navigate(1);
      component.goToToday();
      component.onPickDate('2025-03-09');

      expect(requested.length).toBe(3);
      expect(requested[2].getMonth()).toBe(2);
      expect(requested[2].getDate()).toBe(9);
    });

    it('returns to today', async () => {
      await createCalendar(CalendarView.DAY, new Date(2020, 0, 1));

      component.goToToday();

      const today = new Date();
      expect(component.focusDay.getFullYear()).toBe(today.getFullYear());
      expect(component.focusDay.getDate()).toBe(today.getDate());
    });

    it('ignores an empty or invalid picked date', async () => {
      await createCalendar(CalendarView.DAY);
      const before = component.focusDay.getTime();

      component.onPickDate('');
      component.onPickDate('not-a-date');

      expect(component.focusDay.getTime()).toBe(before);
    });
  });

  describe('the period label', () => {
    it('names the day without its weekday', async () => {
      // 2025 is not the current year, so the year still shows.
      await createCalendar(CalendarView.DAY);
      expect(component.periodLabel).toBe('January 15, 2025');
    });

    it('drops the year in day view while it is the obvious one', async () => {
      const thisYear = new Date();
      thisYear.setMonth(7, 24);
      await createCalendar(CalendarView.DAY, thisYear);
      expect(component.periodLabel).toBe('August 24');
    });

    it('names the month in month view', async () => {
      await createCalendar(CalendarView.MONTH);
      expect(component.periodLabel).toBe('January 2025');
    });

    it('names the week as a range in week view', async () => {
      await createCalendar(CalendarView.WEEK);
      // Mon 13 – Sun 19 January: one month, so the start needs no month of its own.
      expect(component.periodLabel).toBe('13 – Jan 19, 2025');
    });

    it('spells out both months when the week straddles two', async () => {
      // Mon 27 January – Sun 2 February 2025.
      await createCalendar(CalendarView.WEEK, new Date(2025, 0, 29));
      expect(component.periodLabel).toBe('Jan 27 – Feb 2, 2025');
    });

    it('follows the view switcher without the focus day moving', async () => {
      await createCalendar(CalendarView.DAY);
      expect(component.periodLabel).toContain('January 15');

      component.switchView(CalendarView.MONTH);
      expect(component.periodLabel).toBe('January 2025');
      expect(component.focusDay.getDate()).toBe(15);
    });
  });

  describe('accessibility', () => {
    it('ties each calendar\'s tabs to its own panel', async () => {
      await createCalendar(CalendarView.WEEK);
      const first = component.panelId;

      TestBed.resetTestingModule();
      await createCalendar(CalendarView.WEEK);
      expect(component.panelId).not.toBe(first);
    });

    it('exposes the date picker under the calendar\'s own id', async () => {
      await createCalendar(CalendarView.WEEK);
      const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="date"]');
      expect(input?.id).toBe(`${component.panelId}-date`);
    });
  });
});
