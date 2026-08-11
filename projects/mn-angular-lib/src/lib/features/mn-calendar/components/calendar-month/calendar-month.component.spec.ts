import {provideZonelessChangeDetection} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject, Subject} from 'rxjs';

import {CalendarMonthComponent} from './calendar-month.component';
import {CalendarEvent} from '../../models/calendar-event.model';
import {MnLanguageService} from '../../../../language';

/** Minimal stub of MnLanguageService so the component needs no HttpClient. */
class LanguageStub {
  locale = 'en-US';
  locale$ = new BehaviorSubject<string>('en');

  /** Mirrors the real service: `undefined` means the key is not translated. */
  translateIfPresent(): string | undefined {
    return undefined;
  }
}

/** Wednesday 15 January 2025. */
const WEDNESDAY_15_JAN = new Date(2025, 0, 15);

/**
 * Builds a whole-day event on a given date.
 * @param date The day the event falls on.
 * @param id Identity of the event.
 * @returns A calendar event.
 */
function wholeDay(date: Date, id = 'e1'): CalendarEvent {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 0);
  return {
    id,
    title: 'Chosen',
    description: '',
    startTime: start,
    endTime: end,
    color: {id: 'c1', colorName: 'Primary', primaryColor: '#000', secondaryColor: '#fff'},
  };
}

/**
 * Rendering tests for the month grid.
 *
 * Run zoneless on purpose. The grid is fed by streams rather than inputs, and a consumer's
 * events almost always arrive after the first render — from a fetch, or from a parent seeding
 * its own list. Without zone.js nothing schedules a re-render on an emission by itself, so a
 * grid that only repaints when the user happens to click elsewhere is the failure this guards.
 */
describe('CalendarMonthComponent', () => {
  let fixture: ComponentFixture<CalendarMonthComponent>;
  let events: BehaviorSubject<CalendarEvent[]>;
  let focusDay: Subject<Date>;

  /** Titles of the event chips currently rendered in the grid. */
  function renderedChips(): string[] {
    const nodes = fixture.nativeElement.querySelectorAll('[role="gridcell"] [title]');
    return Array.from(nodes as NodeListOf<HTMLElement>).map((node) => node.title);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarMonthComponent],
      providers: [
        provideZonelessChangeDetection(),
        {provide: MnLanguageService, useClass: LanguageStub},
      ],
    }).compileComponents();

    events = new BehaviorSubject<CalendarEvent[]>([]);
    focusDay = new Subject<Date>();

    fixture = TestBed.createComponent(CalendarMonthComponent);
    fixture.componentInstance.focusDay = WEDNESDAY_15_JAN;
    fixture.componentInstance.eventsChanged = events;
    fixture.componentInstance.focusDayChanged = focusDay;
    await fixture.whenStable();
  });

  it('renders events that arrive on the stream after the first render', async () => {
    expect(renderedChips()).toEqual([]);

    events.next([wholeDay(WEDNESDAY_15_JAN)]);
    await fixture.whenStable();

    expect(renderedChips()).toEqual(['Chosen']);
  });

  it('drops events again when the stream empties', async () => {
    events.next([wholeDay(WEDNESDAY_15_JAN)]);
    await fixture.whenStable();
    expect(renderedChips()).toEqual(['Chosen']);

    events.next([]);
    await fixture.whenStable();

    expect(renderedChips()).toEqual([]);
  });

  it('repaints the grid when the focus day moves to another month', async () => {
    events.next([wholeDay(WEDNESDAY_15_JAN)]);
    await fixture.whenStable();
    expect(renderedChips()).toEqual(['Chosen']);

    // March has no cell for 15 January, so the chip has to go with the month.
    focusDay.next(new Date(2025, 2, 10));
    await fixture.whenStable();

    expect(renderedChips()).toEqual([]);
  });
});
