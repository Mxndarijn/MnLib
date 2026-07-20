import {AfterViewInit, Component, computed, DestroyRef, ElementRef, inject, signal, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MnButton, MnDateSelectorBar} from 'mn-angular-lib';

/** A locale preset offered by the "Locale and labels" section. */
type LocalePreset = {
  /** BCP 47 locale passed to the bar. */
  locale: string;
  /** Human-readable name shown on the switch button. */
  name: string;
  /** Label for the bar's "Today" button in this locale. */
  todayLabel: string;
  /** Placeholder for the picker the bar shows when a week won't fit. */
  pickDateLabel: string;
};

/** One entry in the fake agenda shown under the wired-up bar. */
type AgendaItem = {
  time: string;
  title: string;
};

@Component({
  selector: 'app-date-selector-bar-demo',
  standalone: true,
  imports: [CommonModule, MnDateSelectorBar, MnButton],
  templateUrl: './date-selector-bar-demo.html',
  styles: [`
    /* The app's reset strips heading margins, so the page sets its own rhythm —
       without it the section headings read as body copy. */
    h2 { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
    h3 { font-size: 17px; font-weight: 600; margin: 0 0 6px; }
    .intro { max-width: 68ch; margin: 0 0 8px; opacity: 0.7; line-height: 1.6; }
    .demo-sections { display: flex; flex-direction: column; gap: 56px; margin-top: 40px; }
    .demo-sections p { max-width: 68ch; margin: 0; opacity: 0.7; line-height: 1.6; }
    .bar-frame {
      border: 1px solid var(--color-base-300);
      border-radius: var(--mn-radius, 12px);
      background: var(--color-base-200);
      margin-top: 12px;
      overflow: hidden;
    }
    .readout {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px 16px;
      margin-top: 12px;
      font-size: 13px;
    }
    .readout-label { opacity: 0.55; }
    .readout-value { font-weight: 600; font-variant-numeric: tabular-nums; }
    .locale-switch { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .agenda {
      margin-top: 16px;
      border: 1px solid var(--color-base-300);
      border-radius: var(--mn-radius, 12px);
      overflow: hidden;
    }
    .agenda-row {
      display: grid;
      grid-template-columns: 84px 1fr;
      gap: 12px;
      padding: 12px 16px;
      font-size: 14px;
    }
    .agenda-row + .agenda-row { border-top: 1px solid var(--color-base-300); }
    .agenda-time { font-variant-numeric: tabular-nums; opacity: 0.6; }
    .agenda-empty { padding: 24px 16px; font-size: 14px; opacity: 0.5; }
    /* A genuinely resizable frame: the bar sizes to this box, not to the window. */
    .resizable {
      resize: horizontal;
      overflow: auto;
      min-width: 280px;
      max-width: 100%;
      width: 100%;
      border: 1px dashed var(--color-base-300);
      border-radius: var(--mn-radius, 12px);
      background: var(--color-base-200);
      margin-top: 12px;
      padding: 4px;
    }
    .jump-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .log { margin-top: 12px; font-size: 13px; }
    .log-row { display: flex; gap: 12px; padding: 6px 0; font-variant-numeric: tabular-nums; }
    .log-index { opacity: 0.4; min-width: 24px; }
    .log-empty { opacity: 0.5; padding: 6px 0; }
    .note { font-size: 13px; opacity: 0.6; line-height: 1.6; margin-top: 8px; }
  `],
})
export class DateSelectorBarDemo implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly resizableFrame = viewChild<ElementRef<HTMLElement>>('resizableFrame');

  // --- Section 1: default bar -------------------------------------------------
  readonly basicDate = signal<Date>(this.startOfToday());

  // --- Section 2: bar wired to a day agenda -----------------------------------
  readonly agendaDate = signal<Date>(this.startOfToday());
  readonly agendaItems = computed<AgendaItem[]>(() => this.buildAgenda(this.agendaDate()));

  // --- Section 3: locale and labels -------------------------------------------
  readonly localePresets: LocalePreset[] = [
    {locale: 'en-US', name: 'English', todayLabel: 'Today', pickDateLabel: 'Pick a date'},
    {locale: 'nl-NL', name: 'Nederlands', todayLabel: 'Vandaag', pickDateLabel: 'Kies een datum'},
    {locale: 'de-DE', name: 'Deutsch', todayLabel: 'Heute', pickDateLabel: 'Datum wählen'},
    {locale: 'ja-JP', name: '日本語', todayLabel: '今日', pickDateLabel: '日付を選択'},
  ];
  readonly activePreset = signal<LocalePreset>(this.localePresets[0]);
  readonly localeDate = signal<Date>(this.startOfToday());

  // --- Section 4: sizes to its container --------------------------------------
  readonly frameWidth = signal<number>(0);
  readonly responsiveDate = signal<Date>(this.startOfToday());

  // --- Section 5: the window follows the selection ----------------------------
  readonly followDate = signal<Date>(this.startOfToday());

  // --- Section 6: what the bar emits ------------------------------------------
  readonly emitLog = signal<string[]>([]);
  readonly logDate = signal<Date>(this.startOfToday());

  ngAfterViewInit(): void {
    const frame = this.resizableFrame()?.nativeElement;
    if (!frame || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      this.frameWidth.set(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(frame);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /** Moves the selection by a number of days without touching the bar itself. */
  jumpBy(days: number): void {
    const next = new Date(this.followDate());
    next.setDate(next.getDate() + days);
    this.followDate.set(next);
  }

  /** Switches the locale preset used by the localized bar. */
  selectPreset(preset: LocalePreset): void {
    this.activePreset.set(preset);
  }

  /** Records an emitted date so the log section can show emit behaviour. */
  recordEmit(date: Date): void {
    this.logDate.set(date);
    const stamp = date.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'});
    this.emitLog.update((entries) => [stamp, ...entries].slice(0, 8));
  }

  /** Clears the emit log. */
  clearLog(): void {
    this.emitLog.set([]);
  }

  /** Formats a date for the readout lines. */
  format(date: Date, locale = 'en-GB'): string {
    return date.toLocaleDateString(locale, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
  }

  /** Returns today at midnight. */
  private startOfToday(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  /**
   * Builds a deterministic sample agenda for a date, so moving through the day
   * strip visibly changes the content below it. Weekends stay empty.
   */
  private buildAgenda(date: Date): AgendaItem[] {
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) return [];

    const pools: AgendaItem[][] = [
      [
        {time: '09:00', title: 'Sprint planning'},
        {time: '11:30', title: 'Design review — date selector'},
        {time: '15:00', title: 'Pairing on the calendar week view'},
      ],
      [
        {time: '10:00', title: 'Library release checklist'},
        {time: '14:00', title: 'Accessibility pass on form controls'},
      ],
      [
        {time: '08:30', title: 'Standup'},
        {time: '13:00', title: 'Component API review'},
        {time: '16:30', title: 'Docs and demo cleanup'},
      ],
    ];

    // Vary by day-of-month so consecutive days differ, but stay stable per date.
    return pools[date.getDate() % pools.length];
  }
}
