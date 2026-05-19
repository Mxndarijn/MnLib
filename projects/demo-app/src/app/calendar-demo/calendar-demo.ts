import { Component, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CalendarViewComponent,
  CalendarEvent,
  CALENDAR_DATE_FORMATTER,
  DefaultCalendarDateFormatter,
  CALENDAR_CONFIG
} from 'mn-angular-lib';

@Component({
  selector: 'app-calendar-demo',
  standalone: true,
  imports: [CommonModule, CalendarViewComponent],
  providers: [
    { provide: CALENDAR_DATE_FORMATTER, useClass: DefaultCalendarDateFormatter },
    {
      provide: CALENDAR_CONFIG,
      useValue: {
        startHour: 7,
        endHour: 22,
        locale: 'en-US',
        todayLabel: 'Today',
        upcomingEventsTitle: 'Upcoming events',
        viewLabels: { MONTH: 'Month', WEEK: 'Week', DAY: 'Day' },
        mobileBreakpoint: 768
      }
    }
  ],
  templateUrl: './calendar-demo.html',
  styles: [`
    :host { display: block; }
    .calendar-demo-wrapper {
      width: 100vw;
      margin-left: calc(-50vw + 50%);
      height: calc(100vh - 100px);
      display: flex;
      flex-direction: column;
      padding: 0 5vw;
      box-sizing: border-box;
    }
    .calendar-demo-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
    }
    .calendar-demo-header h2 { margin: 0; font-size: 18px; }
    .calendar-demo-subtitle { color: #6b7280; font-size: 12px; }
    .calendar-demo-body { flex: 1; min-height: 0; }
    .calendar-demo-clicked {
      padding: 6px 12px;
      background: #f0f9ff;
      border-radius: 8px;
      border: 1px solid #bae6fd;
      font-size: 13px;
      margin-top: 4px;
    }
  `]
})
export class CalendarDemo {
  eventsEmitter = new EventEmitter<CalendarEvent[]>();
  clickedEvent?: CalendarEvent;

  private sampleEvents: CalendarEvent[] = [];

  constructor() {
    this.generateSampleEvents();
  }

  loadEvents(_focusDate: Date) {
    setTimeout(() => {
      this.eventsEmitter.emit(this.sampleEvents);
    }, 100);
  }

  onEventClick(event: CalendarEvent) {
    this.clickedEvent = event;
  }

  onNewEvent() {
    alert('New event button clicked!');
  }

  private generateSampleEvents() {
    const today = new Date();
    const colors = [
      { id: '1', colorName: 'Blue', primaryColor: '#1e40af', secondaryColor: '#bfdbfe' },
    { id: '2', colorName: 'Green', primaryColor: '#15803d', secondaryColor: '#bbf7d0' },
    { id: '3', colorName: 'Red', primaryColor: '#b91c1c', secondaryColor: '#fecaca' },
    { id: '4', colorName: 'Purple', primaryColor: '#7e22ce', secondaryColor: '#e9d5ff' },
    { id: '5', colorName: 'Orange', primaryColor: '#c2410c', secondaryColor: '#fed7aa' }
    ];

    const makeDate = (dayOffset: number, hour: number, minute = 0): Date => {
      const d = new Date(today);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(hour, minute, 0, 0);
      return d;
    };

    this.sampleEvents = [
      { id: '1', title: 'Team Standup', description: 'Daily sync', startTime: makeDate(0, 9, 0), endTime: makeDate(0, 9, 30), color: colors[0] },
      { id: '2', title: 'Design Review', description: 'Review new mockups', startTime: makeDate(0, 10, 0), endTime: makeDate(0, 11, 30), color: colors[1] },
      { id: '3', title: 'Lunch Meeting', description: 'With client', startTime: makeDate(0, 12, 0), endTime: makeDate(0, 13, 0), color: colors[2] },
      { id: '4', title: 'Sprint Planning', description: 'Next sprint items', startTime: makeDate(1, 14, 0), endTime: makeDate(1, 15, 30), color: colors[3] },
      { id: '5', title: 'Code Review', description: 'PR #42', startTime: makeDate(1, 10, 0), endTime: makeDate(1, 11, 0), color: colors[0] },
      { id: '6', title: 'Workshop', description: 'Angular best practices', startTime: makeDate(2, 9, 0), endTime: makeDate(2, 12, 0), color: colors[4] },
      { id: '7', title: '1:1 with Manager', description: '', startTime: makeDate(-1, 15, 0), endTime: makeDate(-1, 15, 30), color: colors[1] },
      { id: '8', title: 'Release Deploy', description: 'v2.1.0', startTime: makeDate(3, 16, 0), endTime: makeDate(3, 17, 0), color: colors[2] },
      { id: '9', title: 'Overlapping Event A', description: 'Tests overlap layout', startTime: makeDate(0, 14, 0), endTime: makeDate(0, 15, 30), color: colors[3] },
      { id: '10', title: 'Overlapping Event B', description: 'Tests overlap layout', startTime: makeDate(0, 14, 30), endTime: makeDate(0, 16, 0), color: colors[4] },
    ];
  }
}
