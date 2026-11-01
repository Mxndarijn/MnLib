import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { CalendarDayComponent } from './calendar-day.component';
import { CalendarEvent } from 'mn-angular-lib/calendar-core';
import { resolveCalendarConfig } from 'mn-angular-lib/calendar-core';

/**
 * Short host so a 07–22 day grid (30 × 1.5rem rows) must scroll vertically
 * (R7QVk8rz / G6pB4jWN — SuperBottie option 1).
 */
@Component({
  standalone: true,
  imports: [CalendarDayComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="host" style="height: 200px; width: 400px">
      <mn-calendar-day
        [focusDay]="focusDay"
        [eventsChanged]="events$"
        [focusDayChanged]="focus$"
        [config]="config"
      ></mn-calendar-day>
    </div>
  `,
})
class HostComponent {
  focusDay = new Date(2026, 10, 3, 12, 0, 0); // Tue 3 Nov 2026
  events$ = new BehaviorSubject<CalendarEvent[]>([]);
  focus$ = new BehaviorSubject<Date>(this.focusDay);
  config = resolveCalendarConfig({ startHour: 7, endHour: 22 });
}

describe('CalendarDayComponent vertical scroll (R7QVk8rz / G6pB4jWN)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  function dayDebug() {
    return fixture.debugElement.query(By.directive(CalendarDayComponent));
  }

  function day(): CalendarDayComponent {
    return dayDebug().componentInstance as CalendarDayComponent;
  }

  /** Constrain the day host like calendar-view's sized panel does in the app. */
  function constrainDayHost(): void {
    const el = dayDebug().nativeElement as HTMLElement;
    el.style.height = '200px';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.overflow = 'hidden';
  }

  function scroller(): HTMLElement {
    return day().bodyScroller!.nativeElement;
  }

  it('lets the full startHour–endHour range scroll instead of clipping evening rows', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    constrainDayHost();
    fixture.detectChanges();

    const el = scroller();
    expect(el).withContext('body scroller should exist').toBeTruthy();
    expect(getComputedStyle(el).overflowY).toMatch(/auto|scroll/);
    expect(day().totalRows).toBe(30);

    // Fail-before: overflow-hidden + minmax(1.5rem,1fr) kept scrollHeight ≈ clientHeight.
    expect(el.scrollHeight)
      .withContext(`expected scrollable body: scroll=${el.scrollHeight} client=${el.clientHeight}`)
      .toBeGreaterThan(el.clientHeight + 100);

    el.scrollTop = el.scrollHeight;
    expect(el.scrollTop).toBeGreaterThan(0);
  }));

  it('scrolls toward the first event on open when not today', fakeAsync(() => {
    const focus = new Date(2026, 10, 3, 12, 0, 0);
    fixture.componentInstance.focusDay = focus;
    fixture.componentInstance.focus$.next(focus);
    fixture.componentInstance.events$.next([
      {
        id: 'eve',
        title: 'Evening training',
        description: '',
        startTime: new Date(2026, 10, 3, 20, 0, 0),
        endTime: new Date(2026, 10, 3, 21, 0, 0),
        color: { id: 'blue', colorName: 'Blue', primaryColor: '#3366ff', secondaryColor: '#e8eeff' },
      },
    ]);
    fixture.detectChanges();
    tick();
    constrainDayHost();
    fixture.detectChanges();
    day().scrollToInitialRow();
    fixture.detectChanges();

    const el = scroller();
    expect(el.scrollTop).toBeGreaterThan(50);
  }));
});
