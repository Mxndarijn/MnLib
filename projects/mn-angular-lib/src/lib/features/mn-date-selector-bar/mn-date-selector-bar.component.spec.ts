import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';

import {MnDateSelectorBar} from 'mn-angular-lib';
import {MnLanguageService} from '../../language';

/** Minimal stub of MnLanguageService so the component needs no HttpClient. */
class LanguageStub {
  locale = 'en-US';
  locale$ = new BehaviorSubject<string>('en');
}

/** Overrides the reported viewport width for a test. */
function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {configurable: true, value: width});
}

describe('MnDateSelectorBar', () => {
  let fixture: ComponentFixture<MnDateSelectorBar>;
  let component: MnDateSelectorBar;
  const originalWidth = window.innerWidth;

  /** Builds the component at a given viewport width and selected date. */
  async function createBar(width: number, selected = new Date(2024, 5, 15)): Promise<void> {
    setViewportWidth(width);
    await TestBed.configureTestingModule({
      imports: [MnDateSelectorBar],
      providers: [{provide: MnLanguageService, useClass: LanguageStub}],
    }).compileComponents();

    fixture = TestBed.createComponent(MnDateSelectorBar);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('selectedDate', selected);
    fixture.detectChanges();
  }

  afterEach(() => {
    setViewportWidth(originalWidth);
    TestBed.resetTestingModule();
  });

  it('grows the tile count with viewport width (3 → 5 → 7)', async () => {
    // Phones stay compact at 3.
    await createBar(400);
    expect(component.dayTiles().length).toBe(3);

    // Small tablets / large phones show 5.
    TestBed.resetTestingModule();
    await createBar(800);
    expect(component.dayTiles().length).toBe(5);

    // Wide two-layer layout fills its full-width strip row with 7.
    TestBed.resetTestingModule();
    await createBar(1100);
    expect(component.dayTiles().length).toBe(7);

    // Still two-layer at 1300 (single-row only kicks in at 1500) — 7 tiles.
    TestBed.resetTestingModule();
    await createBar(1300);
    expect(component.dayTiles().length).toBe(7);

    // Wide single-row layout also shows 7.
    TestBed.resetTestingModule();
    await createBar(1500);
    expect(component.dayTiles().length).toBe(7);
  });

  it('hides the day strip below the minimum strip width', async () => {
    await createBar(300);
    expect(component.showDayStrip()).toBe(false);

    TestBed.resetTestingModule();
    await createBar(320);
    expect(component.showDayStrip()).toBe(true);

    TestBed.resetTestingModule();
    await createBar(800);
    expect(component.showDayStrip()).toBe(true);
  });

  it('marks the tile matching the selected date within the visible window', async () => {
    await createBar(1300);
    // Pick a date that falls inside the default (today-anchored) window.
    const target = component.dayTiles()[3].date;
    fixture.componentRef.setInput('selectedDate', target);
    fixture.detectChanges();

    const selectedTiles = component.dayTiles().filter((t) => t.isSelected);
    expect(selectedTiles.length).toBe(1);
    expect(selectedTiles[0].date.getTime()).toBe(target.getTime());
  });

  it('emits the clicked tile date on selectDate', async () => {
    await createBar(1300);
    const emitted: Date[] = [];
    component.dateSelected.subscribe((d) => emitted.push(d));

    const tile = component.dayTiles()[2];
    component.selectDate(tile.date);
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe(tile.date);
  });

  it('does not re-emit when selecting the already-selected day', async () => {
    const selected = new Date(2024, 5, 15);
    await createBar(1300, selected);
    const emitted: Date[] = [];
    component.dateSelected.subscribe((d) => emitted.push(d));

    // A fresh Date object for the same calendar day must not emit.
    component.selectDate(new Date(2024, 5, 15));
    expect(emitted.length).toBe(0);
  });

  it('emits today on goToToday', async () => {
    await createBar(1300, new Date(2020, 0, 1));
    const emitted: Date[] = [];
    component.dateSelected.subscribe((d) => emitted.push(d));

    component.goToToday();
    const today = new Date();
    expect(emitted.length).toBe(1);
    expect(emitted[0].getFullYear()).toBe(today.getFullYear());
    expect(emitted[0].getMonth()).toBe(today.getMonth());
    expect(emitted[0].getDate()).toBe(today.getDate());
  });

  it('does not emit on goToToday when today is already selected', async () => {
    await createBar(1300, new Date());
    const emitted: Date[] = [];
    component.dateSelected.subscribe((d) => emitted.push(d));

    component.goToToday();
    expect(emitted.length).toBe(0);
  });

  it('shifts the visible window on arrows without emitting a selection', async () => {
    await createBar(1300);
    const emitted: Date[] = [];
    component.dateSelected.subscribe((d) => emitted.push(d));
    const firstBefore = component.dayTiles()[0].date.getTime();

    component.navigateNext();
    fixture.detectChanges();
    const firstAfterNext = component.dayTiles()[0].date.getTime();

    // Window moved forward by the tile count (7 days at this width).
    expect(firstAfterNext).toBe(firstBefore + 7 * 24 * 60 * 60 * 1000);
    expect(emitted.length).toBe(0);

    component.navigatePrevious();
    fixture.detectChanges();
    expect(component.dayTiles()[0].date.getTime()).toBe(firstBefore);
    expect(emitted.length).toBe(0);
  });

  it('emits the picked date from the date-picker change', async () => {
    await createBar(1300);
    const emitted: Date[] = [];
    component.dateSelected.subscribe((d) => emitted.push(d));

    component.onDateModelChanged('2025-03-09');
    expect(emitted.length).toBe(1);
    expect(emitted[0].getFullYear()).toBe(2025);
    expect(emitted[0].getMonth()).toBe(2);
    expect(emitted[0].getDate()).toBe(9);
  });

  it('re-centres the window but does not emit when the picker re-picks the selected day', async () => {
    await createBar(1300, new Date(2024, 5, 15));
    const emitted: Date[] = [];
    component.dateSelected.subscribe((d) => emitted.push(d));

    component.onDateModelChanged('2024-06-15');
    // The visible window still recentres on the picked day...
    expect(component.dayTiles().some((t) => t.isSelected)).toBe(true);
    // ...but no redundant selection is emitted.
    expect(emitted.length).toBe(0);
  });

  it('ignores an empty or invalid picked date', async () => {
    await createBar(1300);
    const emitted: Date[] = [];
    component.dateSelected.subscribe((d) => emitted.push(d));

    component.onDateModelChanged('');
    component.onDateModelChanged('not-a-date');
    expect(emitted.length).toBe(0);
  });
});
