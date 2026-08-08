import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {firstValueFrom, take} from 'rxjs';
import {MnAlertStore} from './mn-alert.store';
import {MN_ALERT_CONFIG} from './mn-alert.tokens';

describe('MnAlertStore', () => {
  let store: MnAlertStore;

  /** Builds a store through DI, optionally with a host config provided. */
  function makeStore(maxVisible?: number): MnAlertStore {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: maxVisible === undefined
        ? []
        : [{provide: MN_ALERT_CONFIG, useValue: {maxVisible}}]
    });
    return TestBed.inject(MnAlertStore);
  }

  /** The alert list as it stands right now. */
  function current() {
    return firstValueFrom(store.alerts$.pipe(take(1)));
  }

  beforeEach(() => {
    store = makeStore();
  });

  it('should start with empty alerts list', async () => {
    expect(await current()).toEqual([]);
  });

  it('should show an alert and emit it', async () => {
    const id = store.show({ title: 'Hello', kind: 'info'});
    const alerts = await current();
    expect(alerts.length).toBe(1);
    const a = alerts[0];
    expect(a.id).toBe(id);
    expect(a.title).toBe('Hello');
    expect(a.kind).toBe('info');
    // duration should default to per-kind value when not provided
    expect(a.duration).toBe(4000);
  });

  it('should dismiss an alert by id', async () => {
    const id1 = store.show({ title: 'A', kind: 'success' });
    const id2 = store.show({ title: 'B', kind: 'error' });
    expect((await current()).map(a => a.id)).toEqual([id1, id2]);

    store.dismiss(id1);
    expect((await current()).map(a => a.id)).toEqual([id2]);
  });

  it('should clear all alerts', async () => {
    store.show({ title: 'A', kind: 'success' });
    store.show({ title: 'B', kind: 'error' });
    expect((await current()).length).toBe(2);

    store.clear();
    expect(await current()).toEqual([]);
  });

  it('should auto-dismiss alerts with positive duration', fakeAsync(async () => {
    const id = store.show({ title: 'Timed', kind: 'warning', duration: 10 });
    expect((await current()).find(a => a.id === id)).toBeTruthy();

    tick(11);

    expect((await current()).find(a => a.id === id)).toBeFalsy();
  }));

  it('keeps only the three newest alerts by default, dropping the oldest', async () => {
    store.show({title: 'A', kind: 'info'});
    store.show({title: 'B', kind: 'info'});
    store.show({title: 'C', kind: 'info'});
    store.show({title: 'D', kind: 'info'});

    expect((await current()).map(a => a.title)).toEqual(['B', 'C', 'D']);
  });

  it('honours a configured maxVisible over the default', async () => {
    store = makeStore(2);

    store.show({title: 'A', kind: 'info'});
    store.show({title: 'B', kind: 'info'});
    store.show({title: 'C', kind: 'info'});

    expect((await current()).map(a => a.title)).toEqual(['B', 'C']);
  });

  it('does not re-emit when an alert pushed out by the cap later times out', fakeAsync(async () => {
    store = makeStore(1);

    store.show({title: 'Pushed out', kind: 'info', duration: 20});
    store.show({title: 'Survivor', kind: 'info', duration: 1000});

    const emissions: number[] = [];
    const sub = store.alerts$.subscribe(list => emissions.push(list.length));

    // The evicted alert's own timeout would have fired here; it must be a no-op.
    tick(30);

    expect(emissions).toEqual([1]);
    expect((await current()).map(a => a.title)).toEqual(['Survivor']);
    sub.unsubscribe();
    store.clear();
  }));
});
