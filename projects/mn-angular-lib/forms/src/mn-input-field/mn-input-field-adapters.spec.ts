import { defaultTextAdapter } from './mn-input-field-adapters';

describe('defaultTextAdapter', () => {
  describe('applyMask', () => {
    it('should format simple numeric mask', () => {
      const mask = '(000) 000-0000';
      expect(defaultTextAdapter.applyMask!('1', mask)).toBe('(1');
      expect(defaultTextAdapter.applyMask!('123', mask)).toBe('(123) ');
      expect(defaultTextAdapter.applyMask!('123456', mask)).toBe('(123) 456-');
      expect(defaultTextAdapter.applyMask!('1234567890', mask)).toBe('(123) 456-7890');
    });

    it('should format mixed alpha-numeric mask', () => {
      const mask = 'AA-000-**';
      expect(defaultTextAdapter.applyMask!('A', mask)).toBe('A');
      expect(defaultTextAdapter.applyMask!('AB', mask)).toBe('AB-');
      expect(defaultTextAdapter.applyMask!('AB123', mask)).toBe('AB-123-');
      expect(defaultTextAdapter.applyMask!('AB123XY', mask)).toBe('AB-123-XY');
    });

    it('should handle user deleting characters', () => {
      const mask = '(000) 000-0000';
      // If user has "(123) " and deletes ")", they send "(123 "
      expect(defaultTextAdapter.applyMask!('(123 ', mask)).toBe('(123) ');
      // If they delete "3", they send "(12 "
      expect(defaultTextAdapter.applyMask!('(12 ', mask)).toBe('(12');
    });

    it('should skip invalid characters', () => {
      const mask = '(000) 000-0000';
      expect(defaultTextAdapter.applyMask!('12a3', mask)).toBe('(123) ');
    });
  });
});
