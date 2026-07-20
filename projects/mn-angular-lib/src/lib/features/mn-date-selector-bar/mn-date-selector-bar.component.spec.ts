import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';

import {MnDateSelectorBar} from 'mn-angular-lib';
import {MnLanguageService} from '../../language';

/** Minimal stub of MnLanguageService so the component needs no HttpClient. */
class LanguageStub {
  locale = 'en-US';
  locale$ = new BehaviorSubject<string>('en');
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** `Date.getDay()` value for Monday. */
const MONDAY = 1;

/**
 * Widths that land in each state. Everything that isn't a day tile costs 326px
 * (Today, the arrows, the month caption), and each day 80px on top.
 */
const INLINE_WIDTH = 900;
/** Wide enough for a strip, too narrow for a whole week. */
const PARTIAL_WIDTH = 700;
/** Too narrow even for three days, so the picker takes over. */
const COMPACT_WIDTH = 500;

/** Saturday 15 June 2024. Its week runs Mon 10 – Sun 16 June. */
const SATURDAY_15_JUNE = new Date(2024, 5, 15);
/** Index of 15 June within its Monday-first week. */
const SATURDAY_INDEX = 5;

describe('MnDateSelectorBar', () => {
  let fixture: ComponentFixture<MnDateSelectorBar>;
  let component: MnDateSelectorBar;

  /**
   * Builds the component at a given host width and selected date.
   *
   * The bar measures itself with `getBoundingClientRect`, so the width is stubbed
   * on the host element rather than on `window` — that is the whole point of the
   * container-based sizing.
   */
  async function createBar(width: number, selected = SATURDAY_15_JUNE): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [MnDateSelectorBar],
      providers: [{provide: MnLanguageService, useClass: LanguageStub}],
    }).compileComponents();

    fixture = TestBed.createComponent(MnDateSelectorBar);
    component = fixture.componentInstance;

    const host = fixture.nativeElement as HTMLElement;
    spyOn(host, 'getBoundingClientRect').and.returnValue({width} as DOMRect);

    fixture.componentRef.setInput('selectedDate', selected);
    fixture.detectChanges();
  }

  /** Re-selects the given date through the input, as a parent would. */
  function setSelected(date: Date): void {
    fixture.componentRef.setInput('selectedDate', date);
    fixture.detectChanges();
  }

  /** Re-runs the width measurement, standing in for a ResizeObserver callback. */
  function resizeTo(width: number): void {
    const host = fixture.nativeElement as HTMLElement;
    (host.getBoundingClientRect as jasmine.Spy).and.returnValue({width} as DOMRect);
    component.ngOnInit();
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('the week', () => {
    it('always starts on Monday and runs a full seven days', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);
      const tiles = component.dayTiles();

      expect(tiles.length).toBe(7);
      expect(tiles[0].date.getDay()).toBe(MONDAY);
      expect(tiles[0].date.getDate()).toBe(10);
      expect(tiles[6].date.getDate()).toBe(16);
    });

    it('starts on Monday even when Sunday is selected', async () => {
      // Sunday is the end of the week, not the start of the next one — the case
      // a naive `getDay()` offset gets wrong.
      await createBar(INLINE_WIDTH, new Date(2024, 5, 16));
      const tiles = component.dayTiles();

      expect(tiles[0].date.getDay()).toBe(MONDAY);
      expect(tiles[0].date.getDate()).toBe(10);
      expect(tiles[6].isSelected).toBe(true);
    });

    it('never repeats a weekday', async () => {
      await createBar(INLINE_WIDTH);
      const weekdays = component.dayTiles().map((t) => t.date.getDay());
      expect(new Set(weekdays).size).toBe(7);
    });

    it('keeps Monday first after paging', async () => {
      await createBar(INLINE_WIDTH);
      component.navigateNext();
      fixture.detectChanges();
      expect(component.dayTiles()[0].date.getDay()).toBe(MONDAY);

      component.navigatePrevious();
      component.navigatePrevious();
      fixture.detectChanges();
      expect(component.dayTiles()[0].date.getDay()).toBe(MONDAY);
    });
  });

  describe('layout', () => {
    it('puts Today and the week on one row when both fit', async () => {
      await createBar(INLINE_WIDTH);
      expect(component.layout()).toBe('inline');
      expect(component.showDayStrip()).toBe(true);
    });

    it('sheds days rather than adding a second row', async () => {
      await createBar(PARTIAL_WIDTH);
      const count = component.dayTiles().length;

      // Still one row — the bar has no stacked state to fall into.
      expect(component.layout()).toBe('inline');
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThan(7);
    });

    it('swaps the days for a date picker only once even three will not fit', async () => {
      await createBar(COMPACT_WIDTH);
      expect(component.layout()).toBe('compact');
      expect(component.showDayStrip()).toBe(false);
      expect(component.dayTiles().length).toBe(0);
    });

    it('shows between three and seven days wherever a strip is shown', async () => {
      for (const width of [580, 660, 740, 820, 900, 1400]) {
        TestBed.resetTestingModule();
        await createBar(width);
        const count = component.dayTiles().length;
        expect(count).withContext(`at ${width}px`).toBeGreaterThanOrEqual(3);
        expect(count).withContext(`at ${width}px`).toBeLessThanOrEqual(7);
      }
    });

    it('keeps the selected day on screen across a resize', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);
      expect(component.dayTiles().some((t) => t.isSelected)).toBe(true);

      resizeTo(PARTIAL_WIDTH);
      expect(component.dayTiles().some((t) => t.isSelected)).toBe(true);

      // Narrower still, there is no strip for it to be visible in.
      resizeTo(COMPACT_WIDTH);
      expect(component.showDayStrip()).toBe(false);
    });

    it('realigns to Monday when the strip grows back to a full week', async () => {
      // A partial strip slides freely, so growing back must re-anchor rather than
      // keep whatever start it happened to be sitting on.
      await createBar(PARTIAL_WIDTH, SATURDAY_15_JUNE);
      expect(component.dayTiles()[0].date.getDay()).not.toBe(MONDAY);

      resizeTo(INLINE_WIDTH);
      expect(component.dayTiles().length).toBe(7);
      expect(component.dayTiles()[0].date.getDay()).toBe(MONDAY);
    });
  });

  describe('window anchoring', () => {
    it('opens on the week holding the selected day', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);
      expect(component.dayTiles()[SATURDAY_INDEX].isSelected).toBe(true);
    });

    it('holds the week still when the new selection is already in it', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);
      const firstBefore = component.dayTiles()[0].date.getTime();

      // Wednesday of the same week: the strip must not move under the pointer.
      setSelected(new Date(2024, 5, 12));

      expect(component.dayTiles()[0].date.getTime()).toBe(firstBefore);
      expect(component.dayTiles()[2].isSelected).toBe(true);
    });

    it('moves to the new week when the selection lands outside', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);

      // Thursday of the following week.
      setSelected(new Date(2024, 5, 20));

      const tiles = component.dayTiles();
      expect(tiles[0].date.getDate()).toBe(17);
      expect(tiles[0].date.getDay()).toBe(MONDAY);
      expect(tiles[3].isSelected).toBe(true);
    });

    it('follows a selection jumped far away by the parent', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);

      setSelected(new Date(2024, 6, 24));

      const tiles = component.dayTiles();
      expect(tiles[0].date.getDay()).toBe(MONDAY);
      expect(tiles.some((t) => t.isSelected)).toBe(true);
    });
  });

  describe('navigation', () => {
    it('moves a week at a time on the arrows without emitting', async () => {
      await createBar(INLINE_WIDTH);
      const emitted: Date[] = [];
      component.dateSelected.subscribe((d) => emitted.push(d));
      const firstBefore = component.dayTiles()[0].date.getTime();

      component.navigateNext();
      fixture.detectChanges();
      expect(component.dayTiles()[0].date.getTime()).toBe(firstBefore + WEEK_MS);
      expect(emitted.length).toBe(0);

      component.navigatePrevious();
      fixture.detectChanges();
      expect(component.dayTiles()[0].date.getTime()).toBe(firstBefore);
      expect(emitted.length).toBe(0);
    });

    it('turns the page when the arrow keys run off either end', async () => {
      await createBar(INLINE_WIDTH);
      const firstBefore = component.dayTiles()[0].date.getTime();

      // ArrowRight from Sunday lands on the following Monday.
      component.onTileKeydown(new KeyboardEvent('keydown', {key: 'ArrowRight'}), 6);
      fixture.detectChanges();
      expect(component.dayTiles()[0].date.getTime()).toBe(firstBefore + WEEK_MS);
      expect(component.isTabbable(0)).toBe(true);

      // ArrowLeft from Monday lands on the preceding Sunday.
      component.onTileKeydown(new KeyboardEvent('keydown', {key: 'ArrowLeft'}), 0);
      fixture.detectChanges();
      expect(component.dayTiles()[0].date.getTime()).toBe(firstBefore);
      expect(component.isTabbable(6)).toBe(true);
    });

    it('moves focus within the week without moving the week', async () => {
      await createBar(INLINE_WIDTH);
      const firstBefore = component.dayTiles()[0].date.getTime();

      component.onTileKeydown(new KeyboardEvent('keydown', {key: 'ArrowRight'}), 2);
      fixture.detectChanges();

      expect(component.isTabbable(3)).toBe(true);
      expect(component.dayTiles()[0].date.getTime()).toBe(firstBefore);
    });

    it('puts the selected day in the tab order', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);
      expect(component.isTabbable(SATURDAY_INDEX)).toBe(true);
      expect(component.isTabbable(0)).toBe(false);
    });
  });

  describe('selection', () => {
    it('emits the clicked day', async () => {
      await createBar(INLINE_WIDTH);
      const emitted: Date[] = [];
      component.dateSelected.subscribe((d) => emitted.push(d));

      const tile = component.dayTiles()[2];
      component.selectDate(tile.date);
      expect(emitted.length).toBe(1);
      expect(emitted[0]).toBe(tile.date);
    });

    it('does not re-emit when selecting the already-selected day', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);
      const emitted: Date[] = [];
      component.dateSelected.subscribe((d) => emitted.push(d));

      component.selectDate(new Date(2024, 5, 15));
      expect(emitted.length).toBe(0);
    });

    it('emits today and shows its week on goToToday', async () => {
      await createBar(INLINE_WIDTH, new Date(2020, 0, 1));
      const emitted: Date[] = [];
      component.dateSelected.subscribe((d) => emitted.push(d));

      component.goToToday();
      fixture.detectChanges();

      const today = new Date();
      expect(emitted.length).toBe(1);
      expect(emitted[0].getDate()).toBe(today.getDate());
      expect(component.dayTiles().some((t) => t.isToday)).toBe(true);
    });

    it('returns to this week without emitting when today is already selected', async () => {
      await createBar(INLINE_WIDTH, new Date());
      const emitted: Date[] = [];
      component.dateSelected.subscribe((d) => emitted.push(d));

      component.navigateNext();
      fixture.detectChanges();
      expect(component.dayTiles().some((t) => t.isToday)).toBe(false);

      component.goToToday();
      fixture.detectChanges();
      expect(component.dayTiles().some((t) => t.isToday)).toBe(true);
      expect(emitted.length).toBe(0);
    });
  });

  describe('the compact date picker', () => {
    it('emits the picked date', async () => {
      await createBar(COMPACT_WIDTH);
      const emitted: Date[] = [];
      component.dateSelected.subscribe((d) => emitted.push(d));

      component.onDateModelChanged('2025-03-09');
      expect(emitted.length).toBe(1);
      expect(emitted[0].getFullYear()).toBe(2025);
      expect(emitted[0].getMonth()).toBe(2);
      expect(emitted[0].getDate()).toBe(9);
    });

    it('moves the week to the picked day, ready for a wider screen', async () => {
      await createBar(COMPACT_WIDTH, SATURDAY_15_JUNE);

      // Wednesday 24 July 2024, whose week opens on Monday the 22nd. The parent
      // owns the selection, so it feeds the emitted day back as a real one would.
      component.onDateModelChanged('2024-07-24');
      setSelected(new Date(2024, 6, 24));
      resizeTo(INLINE_WIDTH);

      const tiles = component.dayTiles();
      expect(tiles[0].date.getDay()).toBe(MONDAY);
      expect(tiles[0].date.getDate()).toBe(22);
      expect(tiles[2].isSelected).toBe(true);
    });

    it('does not re-emit when the picker re-picks the selected day', async () => {
      await createBar(COMPACT_WIDTH, SATURDAY_15_JUNE);
      const emitted: Date[] = [];
      component.dateSelected.subscribe((d) => emitted.push(d));

      component.onDateModelChanged('2024-06-15');
      expect(emitted.length).toBe(0);
    });

    it('ignores an empty or invalid picked date', async () => {
      await createBar(COMPACT_WIDTH);
      const emitted: Date[] = [];
      component.dateSelected.subscribe((d) => emitted.push(d));

      component.onDateModelChanged('');
      component.onDateModelChanged('not-a-date');
      expect(emitted.length).toBe(0);
    });

    it('gives each bar instance its own picker id', async () => {
      await createBar(COMPACT_WIDTH);
      const first = component.pickerId;

      TestBed.resetTestingModule();
      await createBar(COMPACT_WIDTH);
      expect(component.pickerId).not.toBe(first);
    });
  });

  describe('the month caption', () => {
    it('names the month the strip is sitting in', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);
      expect(component.monthCaption()).toBe('Jun 2024');
    });

    it('reads as a range when the strip straddles two months', async () => {
      // Week of Mon 29 July – Sun 4 August 2024.
      await createBar(INLINE_WIDTH, new Date(2024, 6, 31));
      expect(component.monthCaption()).toBe('Jul – Aug 2024');
    });

    it('carries both years when the strip straddles two of those', async () => {
      // Week of Mon 30 December 2024 – Sun 5 January 2025.
      await createBar(INLINE_WIDTH, new Date(2024, 11, 31));
      expect(component.monthCaption()).toBe('Dec 2024 – Jan 2025');
    });

    it('names the selected month even when there is no strip to describe', async () => {
      // The compact bar has no visible range, but must still be labelled.
      await createBar(COMPACT_WIDTH, SATURDAY_15_JUNE);
      expect(component.showDayStrip()).toBe(false);
      expect(component.monthCaption()).toBe('Jun 2024');
    });

    it('follows the strip as it pages', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);
      expect(component.monthCaption()).toBe('Jun 2024');

      // Three weeks on lands in July.
      component.navigateNext();
      component.navigateNext();
      component.navigateNext();
      fixture.detectChanges();
      expect(component.monthCaption()).toBe('Jul 2024');
    });

    it('marks the day a month changes so the break is visible without a label', async () => {
      await createBar(INLINE_WIDTH, new Date(2024, 6, 31));
      const breaks = component.dayTiles().filter((t) => t.startsNewMonth);

      expect(breaks.length).toBe(1);
      expect(breaks[0].date.getDate()).toBe(1);
    });

    it('marks no break when the strip sits inside one month', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);
      expect(component.dayTiles().some((t) => t.startsNewMonth)).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('gives every day a full spoken date', async () => {
      await createBar(INLINE_WIDTH, SATURDAY_15_JUNE);
      expect(component.dayTiles()[SATURDAY_INDEX].accessibleLabel)
        .toBe('Saturday, June 15, 2024');
    });

    it('marks exactly one day as today', async () => {
      await createBar(INLINE_WIDTH, new Date());
      expect(component.dayTiles().filter((t) => t.isToday).length).toBe(1);
    });
  });
});
