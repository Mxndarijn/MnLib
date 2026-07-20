import {ComponentFixture, TestBed} from '@angular/core/testing';

import {MnCollectionPagination} from './mn-collection-pagination.component';

describe('MnCollectionPagination', () => {
  let fixture: ComponentFixture<MnCollectionPagination>;
  let component: MnCollectionPagination;

  /**
   * Mirrors what MnCollectionBase feeds the component: a window of at most three
   * pages centred on the current one, clamped to the available range.
   */
  const windowAround = (current: number, total: number): number[] => {
    let start = Math.max(1, current - 1);
    let end = start + 2;
    if (end > total) {
      end = total;
      start = Math.max(1, end - 2);
    }
    return Array.from({length: end - start + 1}, (_, i) => start + i);
  };

  /** Sets up the component as a host would for a given position and page count. */
  const at = (current: number, total: number): MnCollectionPagination => {
    component.currentPage = current;
    component.totalPages = total;
    component.visiblePages = windowAround(current, total);
    return component;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnCollectionPagination],
    }).compileComponents();

    fixture = TestBed.createComponent(MnCollectionPagination);
    component = fixture.componentInstance;
  });

  describe('pageSlots', () => {
    /** Renders the strip the way the desktop template does: `1 … 4 5 6 … 50`. */
    const strip = (current: number, total: number): string =>
      at(current, total).pageSlots.map(s => s.page ?? '…').join(' ');

    /** The subset shown below `md`, where anchors and their gaps are hidden. */
    const mobileStrip = (current: number, total: number): string =>
      at(current, total).pageSlots.filter(s => !s.anchor).map(s => s.page ?? '…').join(' ');

    it('anchors both ends with gaps when the window is mid-range', () => {
      expect(strip(5, 50)).toBe('1 … 4 5 6 … 50');
    });

    it('anchors only the far end near the start', () => {
      expect(strip(1, 50)).toBe('1 2 3 … 50');
    });

    it('anchors only the near end at the last page', () => {
      expect(strip(50, 50)).toBe('1 … 48 49 50');
    });

    it('omits the gap when the anchor is adjacent to the window', () => {
      // Window [2,3,4] sits directly against page 1, so no ellipsis is needed.
      expect(strip(3, 5)).toBe('1 2 3 4 5');
    });

    it('adds no anchors when every page already fits in the window', () => {
      expect(strip(2, 3)).toBe('1 2 3');
      expect(at(2, 3).pageSlots.every(s => !s.anchor)).toBeTrue();
    });

    it('always keeps the last page reachable at md+', () => {
      for (const current of [1, 2, 7, 42, 99, 100]) {
        const pages = at(current, 100).pageSlots.map(s => s.page);
        expect(pages).toContain(100);
        expect(pages[0]).toBe(1);
      }
    });

    it('leaves only the page window below md, so the strip cannot wrap', () => {
      expect(mobileStrip(10, 20)).toBe('9 10 11');
      expect(mobileStrip(1, 20)).toBe('1 2 3');
      expect(mobileStrip(20, 20)).toBe('18 19 20');
    });

    it('marks every anchor and gap as anchor-only', () => {
      const slots = at(5, 50).pageSlots;
      expect(slots.filter(s => s.anchor).map(s => s.page)).toEqual([1, null, null, 50]);
    });

    it('returns nothing when the host supplies no window', () => {
      component.visiblePages = [];
      expect(component.pageSlots).toEqual([]);
    });
  });

  describe('pageIndicatorLabel', () => {
    it('states the position and the total page count', () => {
      expect(at(5, 20).pageIndicatorLabel).toBe('Page 5 of 20');
    });

    it('still states the total when every page fits in the window', () => {
      // The strip renders no last-page anchor here, so this text is the only
      // place the total appears.
      expect(at(1, 2).pageIndicatorLabel).toBe('Page 1 of 2');
    });

    it('fills placeholders in a caller-supplied label', () => {
      component.labels = {pageIndicator: 'Pagina {{current}} van {{total}}'};
      expect(at(3, 9).pageIndicatorLabel).toBe('Pagina 3 van 9');
    });
  });

  describe('itemRangeLabel', () => {
    it('clamps the end of the range to the item count', () => {
      component.currentPage = 2;
      component.pageSize = 10;
      component.totalItemCount = 18;
      expect(component.itemRangeLabel).toBe('11–18 of 18');
    });

    it('reports a zero range when there are no items', () => {
      component.currentPage = 1;
      component.pageSize = 10;
      component.totalItemCount = 0;
      expect(component.itemRangeLabel).toBe('0–0 of 0');
    });

    it('fills placeholders in a caller-supplied label', () => {
      component.currentPage = 1;
      component.pageSize = 5;
      component.totalItemCount = 20;
      component.labels = {itemRange: '{{start}} tot {{end}} van {{total}}'};
      expect(component.itemRangeLabel).toBe('1 tot 5 van 20');
    });
  });
});
