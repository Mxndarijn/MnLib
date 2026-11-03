import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  CALENDAR_DATE_FORMATTER,
  CalendarDateFormatter,
  CalendarEvent,
} from 'mn-angular-lib/calendar-core';
import { MnLanguageService } from 'mn-angular-lib/core';
import { UpcomingEventRowComponent } from './upcoming-event-row.component';

/** A formatter that resolves on a later microtask, the way a real async one does. */
const asyncFormatter = {
  formatTime: (date: Date | undefined) =>
    Promise.resolve().then(() => (date ? `${date.getHours()}h` : '')),
} as unknown as CalendarDateFormatter;

/** Minimal language stub: locale$ for the row's reformat-on-language path. */
class LanguageStub {
  readonly locale$ = new BehaviorSubject('en');
  translateIfPresent(): string | undefined {
    return undefined;
  }
}

/** A minimal event; only the times, the title and the colour are read here. */
function event(hour = 10): CalendarEvent {
  return {
    id: '1',
    title: 'Code Review',
    description: '',
    startTime: new Date(2026, 0, 1, hour, 0),
    endTime: new Date(2026, 0, 1, hour + 1, 0),
    color: { primaryColor: '#000' },
  } as CalendarEvent;
}

/**
 * Regression coverage for the time range written after an await, and for
 * reformatting when the parent reuses the row with a new event (track $index).
 */
describe('UpcomingEventRowComponent (zoneless change detection)', () => {
  let fixture: ComponentFixture<UpcomingEventRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpcomingEventRowComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: CALENDAR_DATE_FORMATTER, useValue: asyncFormatter },
        { provide: MnLanguageService, useClass: LanguageStub },
      ],
    }).compileComponents();
  });

  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  it('paints the time range once the formatter resolves', async () => {
    fixture = TestBed.createComponent(UpcomingEventRowComponent);
    fixture.componentRef.setInput('event', event(10));
    fixture.autoDetectChanges();
    await settle();

    expect(fixture.nativeElement.textContent).toContain('10h - 11h');
  });

  it('reformats when the event input is replaced (row reuse)', async () => {
    fixture = TestBed.createComponent(UpcomingEventRowComponent);
    fixture.componentRef.setInput('event', event(10));
    fixture.autoDetectChanges();
    await settle();
    expect(fixture.nativeElement.textContent).toContain('10h - 11h');

    fixture.componentRef.setInput('event', event(17));
    await settle();

    expect(fixture.nativeElement.textContent).toContain('17h - 18h');
    expect(fixture.nativeElement.textContent).not.toContain('10h - 11h');
  });
});
