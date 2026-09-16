import { stepEnabledIndex } from './listbox-navigation';

describe('stepEnabledIndex', () => {
  const options = ['a', 'b-disabled', 'c', 'd', 'e-disabled'];
  const enabled = (option: string) => !option.endsWith('-disabled');

  it('starts at the first enabled option going down and the last going up', () => {
    expect(stepEnabledIndex(options, -1, 1, enabled)).toBe(0);
    expect(stepEnabledIndex(options, -1, -1, enabled)).toBe(3);
  });

  it('skips disabled options', () => {
    expect(stepEnabledIndex(options, 0, 1, enabled)).toBe(2);
    expect(stepEnabledIndex(options, 2, -1, enabled)).toBe(0);
  });

  it('stays put at either end instead of wrapping', () => {
    expect(stepEnabledIndex(options, 3, 1, enabled)).toBe(3);
    expect(stepEnabledIndex(options, 0, -1, enabled)).toBe(0);
  });

  it('answers -1 when nothing can be highlighted', () => {
    expect(stepEnabledIndex([], -1, 1, enabled)).toBe(-1);
    expect(stepEnabledIndex(['x-disabled'], -1, 1, enabled)).toBe(-1);
    // An index left over from a longer list is not kept.
    expect(stepEnabledIndex(['x-disabled'], 4, 1, enabled)).toBe(-1);
  });
});
