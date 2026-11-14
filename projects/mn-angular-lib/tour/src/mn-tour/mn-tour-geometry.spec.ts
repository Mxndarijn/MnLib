import {
  boxChanged,
  findTourTarget,
  padBox,
  placeBeside,
  TOUR_CARD_GAP,
  TOUR_VIEWPORT_MARGIN,
  waitForTourTarget,
} from './mn-tour-geometry';

describe('mn-tour geometry', () => {
  const viewport = { width: 1280, height: 800 };
  const card = { width: 300, height: 160 };

  describe('placeBeside', () => {
    it('puts the card to the right, vertically centred on the highlight', () => {
      const hole = { top: 300, left: 100, width: 200, height: 40 };
      expect(placeBeside(hole, card, viewport)).toEqual({ x: 300 + TOUR_CARD_GAP, y: 320 - 80 });
    });

    it('falls back to the left when the right side has no room', () => {
      const hole = { top: 300, left: 1000, width: 200, height: 40 };
      expect(placeBeside(hole, card, viewport).x).toBe(1000 - TOUR_CARD_GAP - 300);
    });

    it('goes below a full-width target, and above one at the bottom', () => {
      const wide = { top: 100, left: 0, width: 1280, height: 60 };
      expect(placeBeside(wide, card, viewport)).toEqual({ x: 490, y: 160 + TOUR_CARD_GAP });
      const low = { top: 700, left: 0, width: 1280, height: 60 };
      expect(placeBeside(low, card, viewport).y).toBe(700 - TOUR_CARD_GAP - 160);
    });

    it('never leaves the viewport margin', () => {
      const nearTop = { top: 0, left: 100, width: 100, height: 20 };
      expect(placeBeside(nearTop, card, viewport).y).toBe(TOUR_VIEWPORT_MARGIN);
      const huge = { top: 0, left: 0, width: 1280, height: 800 };
      const pos = placeBeside(huge, card, viewport);
      expect(pos.y).toBe(viewport.height - card.height - TOUR_VIEWPORT_MARGIN);
      expect(pos.x).toBeGreaterThanOrEqual(TOUR_VIEWPORT_MARGIN);
    });
  });

  it('pads a box on every side', () => {
    expect(padBox({ top: 10, left: 20, width: 30, height: 40 }, 5)).toEqual({ top: 5, left: 15, width: 40, height: 50 });
  });

  it('only calls a box changed past half a pixel', () => {
    const a = { top: 10, left: 10, width: 10, height: 10 };
    expect(boxChanged(a, { ...a, top: 10.4 })).toBeFalse();
    expect(boxChanged(a, { ...a, top: 11 })).toBeTrue();
    expect(boxChanged(null, a)).toBeTrue();
    expect(boxChanged(null, null)).toBeFalse();
  });

  describe('targets', () => {
    const added: HTMLElement[] = [];
    afterEach(() => added.splice(0).forEach((el) => el.remove()));

    /** Adds a `[data-tour]` element, rendered or not. */
    function add(name: string, rendered = true): HTMLElement {
      const el = document.createElement('div');
      el.setAttribute('data-tour', name);
      el.style.cssText = rendered ? 'width:10px;height:10px' : 'display:none';
      document.body.appendChild(el);
      added.push(el);
      return el;
    }

    it('finds the first rendered marker and ignores hidden copies', () => {
      add('nav', false);
      const shown = add('nav');
      expect(findTourTarget('nav')).toBe(shown);
      expect(findTourTarget('absent')).toBeNull();
    });

    it('escapes the marker value', () => {
      const el = add('a"b');
      expect(findTourTarget('a"b')).toBe(el);
    });

    it('waits for a marker that appears later, and gives up after the timeout', async () => {
      setTimeout(() => add('later'), 40);
      expect(await waitForTourTarget('later', 1000)).not.toBeNull();
      expect(await waitForTourTarget('never', 60)).toBeNull();
    });

    it('stops waiting when cancelled', async () => {
      let cancelled = false;
      setTimeout(() => (cancelled = true), 30);
      const started = Date.now();
      expect(await waitForTourTarget('never', 5000, () => cancelled)).toBeNull();
      expect(Date.now() - started).toBeLessThan(1000);
    });
  });
});
