import {
  Component, Input, Output, EventEmitter, ViewChild, ViewContainerRef,
  AfterViewInit, Type, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../models/calendar-event.model';
import { CalendarEventData } from '../../models/calendar-event-data.model';
import { CalendarEventDefaultComponent } from '../calendar-event-default/calendar-event-default.component';

/**
 * Dynamic event renderer that injects a custom or default event component
 * into its view container.
 *
 * The component to render is resolved in this order:
 * 1. `customComponent` input (set on the parent week/day view)
 * 2. `event.component` (per-event override)
 * 3. {@link CalendarEventDefaultComponent} (library default)
 */
@Component({
  selector: 'mn-calendar-event',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-event.component.html',
  styles: [`
    .calendar-event-wrapper {
      height: 100%;
      width: 100%;
    }
  `]
})
export class CalendarEventComponent implements AfterViewInit, OnChanges {
  /** The event data to render. */
  @Input() event!: CalendarEvent;
  /** Optional custom component type that overrides the default renderer. */
  @Input() customComponent?: Type<CalendarEventData>;
  /** Emits when the rendered event is clicked. */
  @Output() eventClicked = new EventEmitter<CalendarEvent>();

  @ViewChild('eventContainer', { read: ViewContainerRef, static: true }) eventContainer!: ViewContainerRef;

  private rendered = false;

  ngAfterViewInit() {
    this.renderComponent();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.rendered && (changes['event'] || changes['customComponent'])) {
      this.renderComponent();
    }
  }

  /** Emits the event click. */
  onEventClick() {
    this.eventClicked.emit(this.event);
  }

  /** Creates the event component dynamically and sets its `event` property. */
  private renderComponent() {
    if (!this.eventContainer) return;
    this.eventContainer.clear();
    const component = this.customComponent ?? this.event?.component ?? CalendarEventDefaultComponent;
    const ref = this.eventContainer.createComponent(component);
    (ref.instance as CalendarEventData).event = this.event;
    ref.changeDetectorRef.detectChanges();
    this.rendered = true;
  }
}
