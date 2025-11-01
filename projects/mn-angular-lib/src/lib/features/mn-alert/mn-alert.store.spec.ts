import { fakeAsync, tick } from '@angular/core/testing';
import { firstValueFrom, take } from 'rxjs';
import { MnAlertStore } from './mn-alert.store';
import { MnAlert } from './mn-alert.types';

describe('MnAlertStore', () => {
  let store: MnAlertStore;

  beforeEach(() => {
    store = new MnAlertStore();
  });

  it('should start with empty alerts list', async () => {
    const alerts = await firstValueFrom(store.alerts$.pipe(take(1)));
    expect(alerts).toEqual([]);
  });

  it('should show an alert and emit it', async () => {
    const id = store.show({ title: 'Hello', kind: 'info'});
    const alerts = await firstValueFrom(store.alerts$.pipe(take(1)));
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
    let alerts = await firstValueFrom(store.alerts$.pipe(take(1)));
    expect(alerts.map(a => a.id)).toEqual([id1, id2]);

    store.dismiss(id1);
    alerts = await firstValueFrom(store.alerts$.pipe(take(1)));
    expect(alerts.map(a => a.id)).toEqual([id2]);
  });

  it('should clear all alerts', async () => {
    store.show({ title: 'A', kind: 'success' });
    store.show({ title: 'B', kind: 'error' });
    let alerts = await firstValueFrom(store.alerts$.pipe(take(1)));
    expect(alerts.length).toBe(2);

    store.clear();
    alerts = await firstValueFrom(store.alerts$.pipe(take(1)));
    expect(alerts).toEqual([]);
  });

  it('should auto-dismiss alerts with positive duration', fakeAsync(async () => {
    const id = store.show({ title: 'Timed', kind: 'warning', duration: 10 });
    let alerts = await firstValueFrom(store.alerts$.pipe(take(1)));
    expect(alerts.find(a => a.id === id)).toBeTruthy();

    tick(11);

    alerts = await firstValueFrom(store.alerts$.pipe(take(1)));
    expect(alerts.find(a => a.id === id)).toBeFalsy();
  }));
});
