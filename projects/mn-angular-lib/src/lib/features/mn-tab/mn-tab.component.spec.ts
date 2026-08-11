import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideHttpClient} from '@angular/common/http';
import {ActivatedRoute, convertToParamMap, ParamMap, provideRouter, Router} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {BehaviorSubject} from 'rxjs';
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

describe('MnTabComponent URL sync', () => {
  let fixture: ComponentFixture<MnTabComponent>;
  let component: MnTabComponent;
  let navigate: jasmine.Spy;
  let queryParams: BehaviorSubject<ParamMap>;

  /**
   * Boots the component against a stubbed router whose query string starts at
   * `params`, so tab restoration and URL writes can be asserted without a real
   * navigation.
   * @param params - Query parameters the URL starts with.
   */
  async function setup(params: Record<string, string> = {}): Promise<void> {
    queryParams = new BehaviorSubject<ParamMap>(convertToParamMap(params));
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    const route = {
      queryParamMap: queryParams.asObservable(),
      snapshot: {
        get queryParamMap(): ParamMap {
          return queryParams.value;
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [MnTabComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: Router, useValue: {navigate}},
        {provide: ActivatedRoute, useValue: route},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MnTabComponent);
    component = fixture.componentInstance;
  }

  /** Lets the deferred restore announcement run. */
  async function flushRestore(): Promise<void> {
    await Promise.resolve();
  }

  it('restores the tab the URL names, slugging the label key', async () => {
    await setup({tab: 'tab-invites'});
    const onClick = jasmine.createSpy('onClick');
    const items: MnTabItem[] = [
      {label: 'members.tabMembers'},
      {label: 'members.tabInvites', onClick},
    ];
    const emitted: MnTabItem[] = [];
    component.dataSource = {items, defaultActive: 0};
    component.activeChange.subscribe((item) => emitted.push(item));
    fixture.detectChanges();

    expect(component.currentActive).toBe(items[1]);

    // The consumer renders the default tab, so a restore has to announce itself.
    await flushRestore();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(emitted).toEqual([items[1]]);
  });

  it('stays quiet when the URL names the tab that is default anyway', async () => {
    await setup({tab: 'one'});
    const onClick = jasmine.createSpy('onClick');
    const emit = jasmine.createSpy('emit');
    component.dataSource = {items: [{label: 'One', onClick}, {label: 'Two'}], defaultActive: 0};
    component.activeChange.subscribe(emit);
    fixture.detectChanges();
    await flushRestore();

    expect(onClick).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('ignores a URL value that names no tab, leaving the default standing', async () => {
    await setup({tab: 'gone'});
    component.dataSource = dataSource(['One', 'Two']);
    fixture.detectChanges();
    await flushRestore();

    expect(component.currentActive).toBe(component.dataSource.items[0]);
  });

  it('writes the clicked tab to the query string, replacing the history entry', async () => {
    await setup();
    component.dataSource = dataSource(['One', 'Two']);
    fixture.detectChanges();

    component.setActive(component.dataSource.items[1]);

    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: {tab: 'two'},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('prefers an explicit id over the slugged label', async () => {
    await setup({tab: 'entrants'});
    const items: MnTabItem[] = [
      {label: 'matches.hub.tab.overview', id: 'overview'},
      {label: 'matches.hub.tab.deelnemers', id: 'entrants'},
    ];
    component.dataSource = {items, defaultActive: 0};
    fixture.detectChanges();

    expect(component.currentActive).toBe(items[1]);

    component.setActive(items[0]);
    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: {tab: 'overview'},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('uses the configured parameter name', async () => {
    await setup({tab: 'two', sub: 'three'});
    component.dataSource = {...dataSource(['One', 'Two', 'Three']), urlParam: 'sub'};
    fixture.detectChanges();

    // `tab` belongs to another tab bar on the page; only `sub` is ours.
    expect(component.currentActive).toBe(component.dataSource.items[2]);

    component.setActive(component.dataSource.items[0]);
    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: {sub: 'one'},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('stays out of the URL entirely when urlParam is false', async () => {
    await setup({tab: 'two'});
    component.dataSource = {...dataSource(['One', 'Two']), urlParam: false};
    fixture.detectChanges();
    await flushRestore();

    expect(component.currentActive).toBe(component.dataSource.items[0]);

    component.setActive(component.dataSource.items[1]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('follows a URL change made after render, as a back button or deep link does', async () => {
    await setup({tab: 'one'});
    const onClick = jasmine.createSpy('onClick');
    const items: MnTabItem[] = [{label: 'One'}, {label: 'Two', onClick}];
    component.dataSource = {items, defaultActive: 0};
    fixture.detectChanges();

    queryParams.next(convertToParamMap({tab: 'two'}));

    expect(component.currentActive).toBe(items[1]);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps the clicked tab when the consumer rebuilds items before the URL lands', async () => {
    await setup();
    component.dataSource = dataSource(['One', 'Two']);
    fixture.detectChanges();

    // The click is announced synchronously, but the navigation it triggers is
    // not: the stubbed URL still says nothing while the consumer reacts.
    component.setActive(component.dataSource.items[1]);
    component.dataSource = dataSource(['One', 'Two']);
    fixture.detectChanges();

    expect(component.currentActive).toBe(component.dataSource.items[1]);
  });

  it('announces a restored tab once, not on every items rebuild', async () => {
    await setup({tab: 'two'});
    const onClick = jasmine.createSpy('onClick');
    component.dataSource = {items: [{label: 'One'}, {label: 'Two', onClick}], defaultActive: 0};
    fixture.detectChanges();
    await flushRestore();
    expect(onClick).toHaveBeenCalledTimes(1);

    // A consumer whose data source is a computed rebuilds its items on any
    // unrelated change (a badge count, say); the same tab must not reload.
    component.dataSource = {items: [{label: 'One'}, {label: 'Two', onClick}], defaultActive: 0};
    fixture.detectChanges();
    await flushRestore();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(component.currentActive).toBe(component.dataSource.items[1]);
  });

  it('numbers repeated slugs so every tab still round-trips', async () => {
    await setup({tab: 'open-2'});
    const items: MnTabItem[] = [{label: 'requests.open'}, {label: 'invites.open'}];
    component.dataSource = {items, defaultActive: 0};
    fixture.detectChanges();

    expect(component.currentActive).toBe(items[1]);

    component.setActive(items[0]);
    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: {tab: 'open'},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });
});

/** Host for the routed integration test: one tab bar on a real route. */
@Component({
  selector: 'mn-lib-tab-host',
  imports: [MnTabComponent],
  template: '<mn-tab [dataSource]="ds"></mn-tab>',
})
class TabHostComponent {
  /** Two tabs, keyed off their labels. */
  ds: MnTabDataSource = dataSource(['One', 'Two']);
}

describe('MnTabComponent URL sync (routed)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{path: 'members', component: TabHostComponent}]),
      ],
    }).compileComponents();
  });

  /**
   * Clicks the tab at `index` in the rendered bar.
   * @param harness - The routed harness the host is rendered in.
   * @param index - Index of the tab to click.
   */
  function clickTab(harness: RouterTestingHarness, index: number): void {
    const tabs = harness.routeNativeElement?.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs?.[index].click();
  }

  it('changes only the query string, keeping the path and other parameters', async () => {
    const harness = await RouterTestingHarness.create('/members?filter=open');

    clickTab(harness, 1);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/members?filter=open&tab=two');
  });

  it('marks the tab from the URL as selected on first render', async () => {
    const harness = await RouterTestingHarness.create('/members?tab=two');
    harness.detectChanges();

    const tabs = harness.routeNativeElement?.querySelectorAll<HTMLElement>('[role="tab"]');
    expect(tabs?.[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs?.[0].getAttribute('aria-selected')).toBe('false');
  });
});
