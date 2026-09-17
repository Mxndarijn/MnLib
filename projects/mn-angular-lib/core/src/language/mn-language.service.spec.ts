import {HttpClient} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {MnLanguageService} from './mn-language.service';

/** Bundle pairing plural keys with their singular siblings, in two languages. */
const BUNDLES = {
  en: {
    shift: {
      asked: '{{count}} members are notified',
      askedOne: '{{count}} member is notified',
      role: '{{name}} is used by {{count}} shifts',
      roleOne: '{{name}} is used by {{count}} shift',
    },
    plainOnly: '{{count}} items',
    lanes: 'lane picker',
    lanesOne: 'unreachable without a count',
  },
  nl: {
    shift: {
      asked: '{{count}} leden krijgen bericht',
      askedOne: '{{count}} lid krijgt bericht',
    },
  },
};

describe('MnLanguageService', () => {
  let lang: MnLanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // Nothing here fetches: translations are registered from code, so a stub is enough.
      providers: [{ provide: HttpClient, useValue: {} }],
    });
    lang = TestBed.inject(MnLanguageService);
    lang.registerTranslations('en', BUNDLES.en);
    lang.registerTranslations('nl', BUNDLES.nl);
  });

  describe('translate', () => {
    it('interpolates params into the resolved string', () => {
      expect(lang.translate('shift.role', { name: 'Bar', count: 4 })).toBe(
        'Bar is used by 4 shifts',
      );
    });

    it('echoes the key when it is missing', () => {
      expect(lang.translate('nothing.here')).toBe('nothing.here');
    });

    it('resolves a nested key through its dotted path', () => {
      expect(lang.translate('shift.asked', { count: 2 })).toBe('2 members are notified');
    });
  });

  describe('plural selection', () => {
    it('picks the One sibling for a count of one', () => {
      expect(lang.translate('shift.asked', { count: 1 })).toBe('1 member is notified');
    });

    it('keeps the plural key for every other count', () => {
      expect(lang.translate('shift.asked', { count: 0 })).toBe('0 members are notified');
      expect(lang.translate('shift.asked', { count: 2 })).toBe('2 members are notified');
      expect(lang.translate('shift.asked', { count: 17 })).toBe('17 members are notified');
    });

    it('treats a numeric string count as its number', () => {
      // A count read off a JSON payload arrives as a string often enough that a strict
      // comparison would silently render the plural for a single item.
      expect(lang.translate('shift.asked', { count: '1' })).toBe('1 member is notified');
    });

    it('falls back to the plural key when no singular sibling exists', () => {
      // The failure this guards is the ugly one: resolving "plainOnlyOne" and, finding
      // nothing, echoing that raw key into the UI.
      expect(lang.translate('plainOnly', { count: 1 })).toBe('1 items');
    });

    it('leaves a key without a count param untouched', () => {
      expect(lang.translate('lanes')).toBe('lane picker');
      expect(lang.translate('lanes', { name: 'x' })).toBe('lane picker');
    });

    it('ignores a count that is not a number', () => {
      expect(lang.translate('shift.asked', { count: 'many' })).toBe('many members are notified');
    });

    it('selects against the active locale', async () => {
      await lang.setLocale('nl');
      expect(lang.translate('shift.asked', { count: 1 })).toBe('1 lid krijgt bericht');
      expect(lang.translate('shift.asked', { count: 3 })).toBe('3 leden krijgen bericht');
    });

    it('applies to the t() shorthand as well', () => {
      expect(lang.t('shift.asked', { count: 1 })).toBe('1 member is notified');
    });
  });

  describe('translateIfPresent', () => {
    it('tests presence against the plural key, not the singular sibling', () => {
      // Absence is this helper's documented contract, so whether an app happens to have
      // written a singular must not change the answer.
      expect(lang.translateIfPresent('plainOnly', { count: 1 })).toBe('1 items');
      expect(lang.translateIfPresent('absent.key', { count: 1 })).toBeUndefined();
    });

    it('still selects the singular wording when the key is present', () => {
      expect(lang.translateIfPresent('shift.asked', { count: 1 })).toBe('1 member is notified');
    });
  });
});
