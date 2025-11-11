import { TestBed } from '@angular/core/testing';
import { MnAlertService, MnShowInput } from './mn-alert.service';
import { MnAlertStore } from './mn-alert.store';
import { DEFAULT_MN_ALERT_CONFIG, MN_ALERT_CONFIG, MnAlertConfig } from './mn-alert.tokens';

class StoreMock {
  show = jasmine.createSpy('show').and.returnValue('id_1');
  dismiss = jasmine.createSpy('dismiss');
  clear = jasmine.createSpy('clear');
}

describe('MnAlertService', () => {
  let service: MnAlertService;
  let store: StoreMock;

  function setup(cfg?: MnAlertConfig) {
    TestBed.configureTestingModule({
      providers: [
        { provide: MnAlertStore, useFactory: () => (store = new StoreMock() as any) },
        ...(cfg ? [{ provide: MN_ALERT_CONFIG, useValue: cfg }] : [])
      ]
    });
    service = TestBed.inject(MnAlertService);
  }

  beforeEach(() => {
    store = new StoreMock();
  });

  it('uses default config values in kind helpers', () => {
    setup();

    service.info('Hello');

    expect(store.show).toHaveBeenCalledTimes(1);
    const arg = store.show.calls.mostRecent().args[0];
    expect(arg).toEqual(jasmine.objectContaining({
      title: 'Hello',
      subTitle: undefined,
      kind: 'info',
      duration: DEFAULT_MN_ALERT_CONFIG.durations.info,
      cssClass: DEFAULT_MN_ALERT_CONFIG.cssClasses.info,
    }));
  });

  it('merges provided config over defaults (durations/cssClasses/icons) and applies finalize()', () => {
    const cfg: MnAlertConfig = {
      durations: { info: 123, default: 999 },
      cssClasses: { info: 'custom-info' },
      icons: { info: { name: 'i' } },
      fallbackDuration: 111,
      finalize: (a) => ({ ...a, meta: { ...(a.meta ?? {}), finalized: true } })
    };
    setup(cfg);

    service.info('Hi', 'Sub', { meta: { x: 1 } });

    expect(store.show).toHaveBeenCalledTimes(1);
    const arg = store.show.calls.mostRecent().args[0];
    expect(arg).toEqual(jasmine.objectContaining({
      title: 'Hi',
      subTitle: 'Sub',
      kind: 'info',
      duration: 123,
      cssClass: 'custom-info',
      icon: { name: 'i' },
    }));
    expect(arg.meta).toEqual(jasmine.objectContaining({ x: 1, finalized: true }));
  });

  it('kind() duration falls back to defaultDuration when per-kind is null or missing', () => {
    const cfg: MnAlertConfig = {
      durations: { success: null },
      fallbackDuration: 321
    };
    setup(cfg);

    service.success('S');
    const a = store.show.calls.mostRecent().args[0];
    // per-kind null is treated as unset; falls back to defaultDuration
    expect(a.duration).toBe(321);

    service.warning('W');
    const b = store.show.calls.mostRecent().args[0];
    // no duration provided for warning => uses defaultDuration
    expect(b.duration).toBe(321);
  });

  it('show() maps input directly and returns id from store', () => {
    setup();
    const id = service.show({ title: 'T', subTitle: 'S', duration: 10, kind: 'error', cssClass: 'c', icon: 'i', meta: { a: 1 } });
    expect(id).toBe('id_1');
    expect(store.show).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'T', subTitle: 'S', duration: 10, kind: 'error', cssClass: 'c', icon: 'i', meta: { a: 1 }
    }));
  });

  it('delegates dismiss and clear to the store', () => {
    setup();

    service.dismiss('some');
    service.clear();

    expect(store.dismiss).toHaveBeenCalledWith('some');
    expect(store.clear).toHaveBeenCalled();
  });
});
