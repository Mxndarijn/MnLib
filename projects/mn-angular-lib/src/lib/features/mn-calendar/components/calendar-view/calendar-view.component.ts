import {
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Inject,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  Type
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BehaviorSubject, skip, Subject, takeUntil} from 'rxjs';
import {CalendarButton, CalendarEvent} from '../../models/calendar-event.model';
import {CalendarEventData} from '../../models/calendar-event-data.model';
import {
  CALENDAR_CONFIG,
  CalendarConfig,
  CalendarView,
  DEFAULT_CALENDAR_CONFIG,
  MN_CALENDAR_CONFIG,
  provideMnCalendarConfig,
  resolveCalendarConfig
} from '../../models/calendar-config.model';
import {MnLanguageService} from '../../../../language';
import {CALENDAR_DATE_FORMATTER, CalendarDateFormatter} from '../../services/calendar-date-formatter';
import {DefaultCalendarDateFormatter} from '../../services/default-calendar-date-formatter';
import {CalendarMonthComponent} from '../calendar-month/calendar-month.component';
import {CalendarWeekComponent} from '../calendar-week/calendar-week.component';
import {CalendarDayComponent} from '../calendar-day/calendar-day.component';
import {UpcomingEventsComponent} from '../upcoming-events/upcoming-events.component';
import {MnButton} from '../../../mn-button';
import {MnDatetime} from '../../../mn-datetime';
import {FormsModule} from '@angular/forms';

/**
 * Main calendar orchestrator component.
 *
 * Provides a toolbar with view switching (month / week / day), date navigation,
 * and an optional action button. The active view and an upcoming-events sidebar
 * are rendered inside a responsive grid layout.
 *
 * All configuration (visible hours, locale, labels, mobile breakpoint) is read
 * from the `mn-config.json5` system via {@link MN_CALENDAR_CONFIG}, falling back
 * to the legacy {@link CALENDAR_CONFIG} injection token, then to built-in defaults.
 * Date formatting is delegated to the {@link CALENDAR_DATE_FORMATTER} token.
 *
 * @example
 * ```html
 * <app-calendar-view
 *   [showButton]="true"
 *   [buttonTitle]="'New Event'"
 *   [NewCalendarItemsEvent]="eventsEmitter"
 *   (RequestNewCalendarItemsEvent)="loadEvents($event)"
 *   (CalendarItemClickedEvent)="onEventClick($event)"
 *   (ButtonClickedEvent)="openModal()">
 * </app-calendar-view>
 * ```
 */
@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [
    CommonModule,
    CalendarMonthComponent,
    CalendarWeekComponent,
    CalendarDayComponent,
    UpcomingEventsComponent,
    MnButton,
    MnDatetime,
    FormsModule
  ],
  templateUrl: './calendar-view.component.html',
  providers: [
    provideMnCalendarConfig(DEFAULT_CALENDAR_CONFIG),
  ],
  styles: [`:host { display: flex; flex-direction: column; width: 100%; height: 100%; }`]
})
export class CalendarViewComponent implements OnInit, OnDestroy {
  /** Whether to show the action button in the toolbar. */
  @Input() showButton = false;
  /** Label text for the action button. */
  @Input() buttonTitle = '';
  /** Array of buttons to display in the toolbar's top-right area. */
  @Input() buttons: CalendarButton[] = [];
  /** Custom event renderer component type. */
  @Input() CalendarEventComponent?: Type<CalendarEventData>;
  /** Observable or EventEmitter that pushes new event arrays into the calendar. */
  @Input() NewCalendarItemsEvent?: EventEmitter<CalendarEvent[]>;

  /** Emits when the calendar needs fresh event data (e.g. after navigation). */
  @Output() RequestNewCalendarItemsEvent = new EventEmitter<Date>();
  /** Emits when a calendar event is clicked. */
  @Output() CalendarItemClickedEvent = new EventEmitter<CalendarEvent>();
  /** Emits when the action button is clicked. */
  @Output() ButtonClickedEvent = new EventEmitter<void>();

  readonly CalendarView = CalendarView;
  currentView = CalendarView.WEEK;
  focusDay = new Date();
  dateInputValue = '';
  viewOptions: { value: CalendarView; label: string }[] = [];
  isMobileView = false;
  isTabletView = false;

  /** BehaviorSubject so late-subscribing child views receive the last emitted events. */
  internalEventsChanged = new BehaviorSubject<CalendarEvent[]>([]);
  /** Subject for broadcasting focus-day changes to child views. */
  internalFocusDayChanged = new Subject<Date>();

  private destroy$ = new Subject<void>();
  private formatter: CalendarDateFormatter;
  protected config: CalendarConfig;
  /** Reference to the injected mn-config object (mutated in-place on locale change). */
  private readonly mnConfigRef: CalendarConfig | null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly lang = inject(MnLanguageService);

  constructor(
    @Optional() @Inject(CALENDAR_DATE_FORMATTER) formatter: CalendarDateFormatter | null,
    @Optional() @Inject(MN_CALENDAR_CONFIG) mnConfig: CalendarConfig | null,
    @Optional() @Inject(CALENDAR_CONFIG) legacyConfig: CalendarConfig | null
  ) {
    this.formatter = formatter ?? new DefaultCalendarDateFormatter();
    // Keep a reference to the injected config so we can re-read it after locale changes.
    this.mnConfigRef = mnConfig;
    // Priority: mn-config system > legacy CALENDAR_CONFIG > built-in defaults
    const raw = mnConfig ?? legacyConfig ?? undefined;
    this.config = resolveCalendarConfig(raw as Partial<CalendarConfig> | undefined);
  }

  @HostListener('window:resize')
  onResize() {
    this.checkMobileView();
  }

  ngOnInit() {
    this.rebuildFromConfig();

    // Re-resolve config when locale changes (supports $translate in mn-config).
    const sub = this.lang.locale$.pipe(skip(1)).subscribe(() => {
      this.rebuildFromConfig();
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());

    this.checkMobileView();
    this.updateDateInput();
    this.RequestNewCalendarItemsEvent.emit(this.focusDay);

    if (this.NewCalendarItemsEvent) {
      this.NewCalendarItemsEvent.pipe(takeUntil(this.destroy$)).subscribe(events => {
        this.internalEventsChanged.next(events);
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Switches the active view. On mobile, forces day view. */
  switchView(view: CalendarView) {
    if (this.isMobileView) {
      this.currentView = CalendarView.DAY;
      return;
    }
    this.currentView = view;
  }

  /** Navigates to the previous period (month / week / day). */
  navigatePrevious() {
    const d = new Date(this.focusDay);
    switch (this.currentView) {
      case CalendarView.MONTH: d.setMonth(d.getMonth() - 1); break;
      case CalendarView.WEEK: d.setDate(d.getDate() - 7); break;
      case CalendarView.DAY: d.setDate(d.getDate() - 1); break;
    }
    this.setFocusDay(d);
  }

  /** Navigates to the next period (month / week / day). */
  navigateNext() {
    const d = new Date(this.focusDay);
    switch (this.currentView) {
      case CalendarView.MONTH: d.setMonth(d.getMonth() + 1); break;
      case CalendarView.WEEK: d.setDate(d.getDate() + 7); break;
      case CalendarView.DAY: d.setDate(d.getDate() + 1); break;
    }
    this.setFocusDay(d);
  }

  /** Navigates to today. */
  goToToday() {
    this.setFocusDay(new Date());
  }

  /** Handles the date-picker input change. */
  onDateInputChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.setFocusDay(new Date(value));
    }
  }

  /** Handles the mn-lib-datetime ngModel change. */
  onDateStringChange(value: string) {
    if (value) {
      this.setFocusDay(new Date(value));
    }
  }

  /** Handles a day click from the month view — switches to day view. */
  onMonthDayClick(date: Date) {
    this.currentView = CalendarView.DAY;
    this.setFocusDay(date);
  }

  /** Forwards a child event click to the parent output. */
  onEventClick(event: CalendarEvent) {
    this.CalendarItemClickedEvent.emit(event);
  }

  /** trackBy for view option buttons. */
  trackByView(_index: number, item: { value: CalendarView }): string {
    return item.value;
  }

  /** Rebuilds view options and labels from the current config. */
  private rebuildFromConfig() {
    // Re-resolve from the injected config reference which is mutated in-place by the provider on locale change.
    if (this.mnConfigRef) {
      this.config = resolveCalendarConfig(this.mnConfigRef as Partial<CalendarConfig>);
    }
    this.viewOptions = [
      { value: CalendarView.MONTH, label: this.config.viewLabels['MONTH'] ?? 'Month' },
      { value: CalendarView.WEEK, label: this.config.viewLabels['WEEK'] ?? 'Week' },
      { value: CalendarView.DAY, label: this.config.viewLabels['DAY'] ?? 'Day' }
    ];
  }

  private checkMobileView() {
    const wasMobile = this.isMobileView;
    const width = window.innerWidth;
    this.isMobileView = width < 475;
    this.isTabletView = width >= 475 && width < 1024;
    if (this.isMobileView && !wasMobile) {
      this.currentView = CalendarView.DAY;
    }
  }

  private setFocusDay(date: Date) {
    this.focusDay = date;
    this.updateDateInput();
    this.internalFocusDayChanged.next(date);
    this.RequestNewCalendarItemsEvent.emit(date);
  }

  private updateDateInput() {
    this.dateInputValue = this.formatter.formatDateForFormControl(this.focusDay);
  }
}
