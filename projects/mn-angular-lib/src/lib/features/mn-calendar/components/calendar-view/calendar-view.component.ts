import {
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Type
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {LucideChevronLeft, LucideChevronRight} from '@lucide/angular';
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
import {CalendarMonthComponent} from '../calendar-month/calendar-month.component';
import {CalendarWeekComponent} from '../calendar-week/calendar-week.component';
import {CalendarDayComponent} from '../calendar-day/calendar-day.component';
import {UpcomingEventsComponent} from '../upcoming-events/upcoming-events.component';
import {MnButton} from '../../../mn-button';
import {MnDatetime} from '../../../mn-datetime';

/** Gives each calendar instance a unique id to tie its tabs to its view panel. */
let instanceCounter = 0;

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
 * <mn-calendar-view
 *   [showButton]="true"
 *   [buttonTitle]="'New Event'"
 *   [NewCalendarItemsEvent]="eventsEmitter"
 *   (RequestNewCalendarItemsEvent)="loadEvents($event)"
 *   (CalendarItemClickedEvent)="onEventClick($event)"
 *   (ButtonClickedEvent)="openModal()">
 * </mn-calendar-view>
 * ```
 */
@Component({
  selector: 'mn-calendar-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CalendarMonthComponent,
    CalendarWeekComponent,
    CalendarDayComponent,
    UpcomingEventsComponent,
    MnButton,
    MnDatetime,
    LucideChevronLeft,
    LucideChevronRight
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
  /** Ties the view tabs to the panel they control, uniquely per calendar. */
  readonly panelId = `mn-calendar-panel-${++instanceCounter}`;
  currentView = CalendarView.WEEK;
  focusDay = new Date();
  viewOptions: { value: CalendarView; label: string }[] = [];
  isMobileView = false;
  isTabletView = false;

  /** BehaviorSubject so late-subscribing child views receive the last emitted events. */
  internalEventsChanged = new BehaviorSubject<CalendarEvent[]>([]);
  /** Subject for broadcasting focus-day changes to child views. */
  internalFocusDayChanged = new Subject<Date>();

  private destroy$ = new Subject<void>();
  protected config: CalendarConfig;
  /** Reference to the injected mn-config object (mutated in-place on locale change). */
  private readonly mnConfigRef: CalendarConfig | null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly lang = inject(MnLanguageService);

  constructor() {
    const mnConfig = inject<CalendarConfig | null>(MN_CALENDAR_CONFIG, {optional: true});
    const legacyConfig = inject<CalendarConfig | null>(CALENDAR_CONFIG, {optional: true});

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

  /**
   * Names the stretch of time on screen — the day, the week, or the month. It is
   * the toolbar's orientation: without it, navigating leaves you somewhere with
   * no label. Announced politely, so stepping through says where you landed.
   */
  get periodLabel(): string {
    const locale = this.config.locale;

    if (this.currentView === CalendarView.MONTH) {
      return this.focusDay.toLocaleDateString(locale, {month: 'long', year: 'numeric'});
    }

    if (this.currentView === CalendarView.DAY) {
      // No weekday: the view's own column header already says which day it is,
      // and the year only earns its place once it stops being the obvious one.
      return this.focusDay.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        ...(this.focusDay.getFullYear() !== new Date().getFullYear() ? {year: 'numeric'} : {}),
      });
    }

    const start = this.startOfWeek(this.focusDay);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    // Only repeat what actually changes across the week's two ends.
    const from = start.getFullYear() !== end.getFullYear()
      ? start.toLocaleDateString(locale, {day: 'numeric', month: 'short', year: 'numeric'})
      : start.toLocaleDateString(locale, {
        day: 'numeric',
        ...(start.getMonth() !== end.getMonth() ? {month: 'short'} : {}),
      });
    const to = end.toLocaleDateString(locale, {day: 'numeric', month: 'short', year: 'numeric'});
    return `${from} – ${to}`;
  }

  /** The focus day as YYYY-MM-DD, for the toolbar's date picker. */
  get focusDayString(): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const d = this.focusDay;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /**
   * Steps the calendar by one unit of whatever is on screen: a day in day view,
   * a week in week view, a month in month view. Navigating by the visible unit is
   * what makes one pair of arrows serve all three.
   */
  navigate(step: number) {
    const next = new Date(this.focusDay);

    switch (this.currentView) {
      case CalendarView.DAY:
        next.setDate(next.getDate() + step);
        break;
      case CalendarView.WEEK:
        next.setDate(next.getDate() + step * 7);
        break;
      default:
        this.setFocusDay(this.addMonths(this.focusDay, step));
        return;
    }

    this.setFocusDay(next);
  }

  /** Returns the calendar to today. */
  goToToday() {
    this.setFocusDay(new Date());
  }

  /**
   * Handles the toolbar date picker.
   * @param value The date string in YYYY-MM-DD format.
   */
  onPickDate(value: string) {
    if (!value) return;
    const picked = new Date(value + 'T00:00:00');
    if (isNaN(picked.getTime())) return;
    this.setFocusDay(picked);
  }

  /** Handles a day click from the month view â€” switches to day view. */
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

  /**
   * Adds months without the end-of-month overflow `setMonth` alone produces —
   * 31 January plus one month is 28 February, not 3 March.
   */
  private addMonths(date: Date, months: number): Date {
    const day = date.getDate();
    const shifted = new Date(date);
    shifted.setDate(1);
    shifted.setMonth(shifted.getMonth() + months);
    const lastDayOfMonth = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
    shifted.setDate(Math.min(day, lastDayOfMonth));
    return shifted;
  }

  /** Monday of the week containing `date`, matching the grid the views draw. */
  private startOfWeek(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  }

  private setFocusDay(date: Date) {
    this.focusDay = date;
    this.internalFocusDayChanged.next(date);
    this.RequestNewCalendarItemsEvent.emit(date);
  }
}
