import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import {
  CALENDAR_DATE_FORMATTER,
  CalendarDateFormatter,
  CalendarEvent,
} from 'mn-angular-lib/calendar-core';
import { UpcomingEventRowComponent } from './upcoming-event-row.component';

/** A formatter that resolves on a later microtask, the way a real async one does. */
const asyncFormatter = {
  formatTime: (date: Date | undefined) =>
    Promise.resolve().then(() => (date ? `${date.getHours()}h` : '')),
} as unknown as CalendarDateFormatter;

/** A minimal event; only the times, the title and the colour are read here. */
function event(): CalendarEvent {
  return {
    id: '1',
    title: 'Code Review',
    description: '',
    startTime: new Date(2026, 0, 1, 10, 0),
    endTime: new Date(2026, 0, 1, 11, 0),
    color: { primaryColor: '#000' },
  } as CalendarEvent;
}

/** Stands in for the sidebar that renders these rows. */
@Component({
  standalone: true,
  imports: [UpcomingEventRowComponent],
  template: `<mn-upcoming-event-row [event]="row"></mn-upcoming-event-row>`,
})
class HostComponent {
  readonly row = event();
}

/**
 * Regression coverage for the time range written after an await.
 *
 * The row is OnPush, and its first render happens while `formatTime` is still pending — the two
 * awaited values land in a promise continuation, which notifies nothing. Without the row marking
 * itself, a zoneless consumer sees an empty time for as long as nothing else repaints the sidebar.
 * The spec never calls `detectChanges()` after the act, so only the component's own mark can
 * make it pass.
 */
describe('UpcomingEventRowComponent (zoneless change detection)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: CALENDAR_DATE_FORMATTER, useValue: asyncFormatter },
      ],
    }).compileComponents();
  });

  it('paints the time range once the formatter resolves', async () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    // The awaits inside ngOnInit are plain promises, which zoneless stability does not track.
    // One macrotask drains them; `whenStable` then waits for the render the component's own
    // mark scheduled.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('10h - 11h');
  });
});
