import { anchoredPanelPlacement } from './anchored-panel-placement';

describe('anchoredPanelPlacement', () => {
  it('opens below the trigger while the viewport has room there', () => {
    const placement = anchoredPanelPlacement({ top: 100, bottom: 140 }, 900, 0, 240);

    expect(placement.top).toBe('140px');
    expect(placement.bottom).toBe('auto');
    // Plenty of room: the panel keeps its own cap rather than the viewport's.
    expect(placement.maxHeight).toBeNull();
  });

  it('flips above the trigger when the room below is too small and above is larger', () => {
    // A picker at the foot of the page: 60px of viewport left under it.
    const placement = anchoredPanelPlacement({ top: 800, bottom: 840 }, 900, 0, 240);

    expect(placement.top).toBe('auto');
    expect(placement.bottom).toBe('100px');
    expect(placement.maxHeight).toBeNull();
  });

  it('caps the height to the room on the chosen side when that is less than the panel cap', () => {
    const placement = anchoredPanelPlacement({ top: 100, bottom: 140 }, 300, 0, 240);

    // 300 - 140 - 8 margin = 152px below, which beats the 92px above, so it stays below
    // and scrolls inside what is left.
    expect(placement.top).toBe('140px');
    expect(placement.maxHeight).toBe('152px');
  });

  it('keeps the gap between trigger and panel on both sides', () => {
    expect(anchoredPanelPlacement({ top: 100, bottom: 140 }, 900, 4, 240).top).toBe('144px');
    expect(anchoredPanelPlacement({ top: 800, bottom: 840 }, 900, 4, 240).bottom).toBe('104px');
  });
});
