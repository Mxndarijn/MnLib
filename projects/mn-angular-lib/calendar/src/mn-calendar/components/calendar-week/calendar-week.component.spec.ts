import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { CalendarWeekComponent } from './calendar-week.component';
import { CalendarEvent, resolveCalendarConfig } from 'mn-angular-lib/calendar-core';

@Component({
  standalone: true,
  imports: [CalendarWeekComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="host" style="height: 200px; width: 600px">
      <mn-calendar-week
        [focusDay]="focusDay"
        [eventsChanged]="events$"
        [focusDayChanged]="focus$"
        [config]="config"
      ></mn-calendar-week>
    </div>
  `,
})
class HostComponent {
  focusDay = new Date(2026, 10, 3, 12, 0, 0);
  events$ = new BehaviorSubject<CalendarEvent[]>([]);
  focus$ = new BehaviorSubject<Date>(this.focusDay);
  config = resolveCalendarConfig({ startHour: 7, endHour: 22 });
}

describe('CalendarWeekComponent vertical scroll', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  const ev = (id: string, h: number): CalendarEvent => ({
    id,
    title: id,
    description: '',
    startTime: new Date(2026, 10, 3, h, 0, 0),
    endTime: new Date(2026, 10, 3, h + 1, 0, 0),
    color: { id: 'blue', colorName: 'Blue', primaryColor: '#3366ff', secondaryColor: '#e8eeff' },
  });

  it('does not snap back to the initial row when events are re-emitted after the user scrolled', fakeAsync(() => {
    fixture.componentInstance.events$.next([ev('eve', 20)]);
    fixture.detectChanges();
    tick();
    const debug = fixture.debugElement.query(By.directive(CalendarWeekComponent));
    const host = debug.nativeElement as HTMLElement;
    host.style.height = '200px';
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.overflow = 'hidden';
    fixture.detectChanges();
    const week = debug.componentInstance as CalendarWeekComponent;
    week.scrollToInitialRow();

    const el = week.bodyScroller!.nativeElement;
    el.scrollTop = 10;
    fixture.componentInstance.events$.next([ev('eve', 20), ev('early', 8)]);
    fixture.detectChanges();
    tick();

    expect(el.scrollTop).toBe(10);
  }));
});
