import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideHttpClient} from '@angular/common/http';
import {MnTabComponent} from 'mn-angular-lib';
import {MnTabDataSource, MnTabItem} from './mn-tab.types';

/**
 * Builds a data source with the given labels and an optional default index.
 * @param labels - Tab labels to create items for.
 * @param defaultActive - Index of the tab active by default.
 */
function dataSource(labels: string[], defaultActive = 0): MnTabDataSource {
  return {
    items: labels.map((label) => ({label})),
    defaultActive,
  };
}

describe('MnTabComponent', () => {
  let fixture: ComponentFixture<MnTabComponent>;
  let component: MnTabComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnTabComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MnTabComponent);
    component = fixture.componentInstance;
  });

  it('selects the default tab once items are known', () => {
    component.dataSource = dataSource(['One', 'Two']);
    fixture.detectChanges();

    expect(component.currentActive).toBe(component.dataSource.items[0]);
  });

  it('selects the default tab when items load after the first render', () => {
    // The data source starts empty (data not yet fetched).
    component.dataSource = dataSource([]);
    fixture.detectChanges();
    expect(component.currentActive).toBeUndefined();

    // Items arrive in place, mirroring an async fetch resolving.
    component.dataSource.items = dataSource(['One', 'Two']).items;
    fixture.detectChanges();

    expect(component.currentActive).toBe(component.dataSource.items[0]);
  });

  it('re-resolves the active tab when the items array is rebuilt', () => {
    component.dataSource = dataSource(['One']);
    fixture.detectChanges();
    const stale = component.currentActive;

    // Rebuild with brand-new item objects (e.g. permission-dependent tabs).
    component.dataSource.items = dataSource(['One', 'Two', 'Three']).items;
    fixture.detectChanges();

    expect(component.currentActive).not.toBe(stale);
    expect(component.currentActive).toBe(component.dataSource.items[0]);
  });

  it('re-resolves the active tab when the whole data source is replaced', () => {
    component.dataSource = dataSource(['One']);
    fixture.detectChanges();

    // The consumer swaps in a new data source object after permissions resolve.
    component.dataSource = dataSource(['One', 'Two']);
    fixture.detectChanges();

    expect(component.currentActive).toBe(component.dataSource.items[0]);
    expect(component.dataSource.items.length).toBe(2);
  });

  it('honours a non-zero default active index', () => {
    component.dataSource = dataSource(['One', 'Two', 'Three'], 2);
    fixture.detectChanges();

    expect(component.currentActive).toBe(component.dataSource.items[2]);
  });

  it('falls back to the first tab when the default index is out of range', () => {
    component.dataSource = dataSource(['One', 'Two'], 5);
    fixture.detectChanges();

    expect(component.currentActive).toBe(component.dataSource.items[0]);
  });

  it('keeps the user selection across change-detection passes', () => {
    component.dataSource = dataSource(['One', 'Two', 'Three']);
    fixture.detectChanges();

    const second = component.dataSource.items[1];
    component.setActive(second);
    fixture.detectChanges();

    expect(component.currentActive).toBe(second);
  });

  it('emits, activates and deactivates when switching tabs', () => {
    const onClick = jasmine.createSpy('onClick');
    const onDeactivate = jasmine.createSpy('onDeactivate');
    const items: MnTabItem[] = [
      {label: 'One', onDeactivate},
      {label: 'Two', onClick},
    ];
    component.dataSource = {items, defaultActive: 0};
    fixture.detectChanges();

    const emitted: MnTabItem[] = [];
    component.activeChange.subscribe((item) => emitted.push(item));

    component.setActive(items[1]);

    expect(onDeactivate).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(emitted).toEqual([items[1]]);
    expect(component.currentActive).toBe(items[1]);
  });

  it('does nothing when re-selecting the already active tab', () => {
    const onClick = jasmine.createSpy('onClick');
    const items: MnTabItem[] = [{label: 'One', onClick}];
    component.dataSource = {items, defaultActive: 0};
    fixture.detectChanges();

    const emit = jasmine.createSpy('emit');
    component.activeChange.subscribe(emit);

    component.setActive(items[0]);

    expect(onClick).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
