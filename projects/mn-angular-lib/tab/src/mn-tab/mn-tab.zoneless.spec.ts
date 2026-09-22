import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { MnLanguageService } from 'mn-angular-lib/core';
import { MnTabComponent } from './mn-tab.component';
import { MnTabDataSource } from './mn-tab.types';

/** A three-tab source whose ids double as the URL keys. */
function dataSource(): MnTabDataSource {
  return {
    items: [
      { id: 'members', label: 'Members' },
      { id: 'invites', label: 'Invites' },
      { id: 'archive', label: 'Archive' },
    ],
    defaultActive: 0,
  };
}

/**
 * Drives the bar the way a zoneless consumer does: through a signal-backed binding, so a rebuilt
 * tab set arrives as a new input reference rather than as a poke at the instance.
 */
@Component({
  standalone: true,
  imports: [MnTabComponent],
  template: `<mn-tab [dataSource]="tabs()"></mn-tab>`,
})
class HostComponent {
  readonly tabs = signal<MnTabDataSource>(dataSource());
}

/**
 * Regression coverage for the selection changing without a click.
 *
 * The component is OnPush, so the query-parameter subscription and the ngDoCheck re-resolve both
 * move `currentActive` from outside any listener Angular wraps. Nothing marks the view for them on
 * its own, and a zoneless app simply skips an unmarked view — the bar would keep highlighting the
 * tab the user has navigated away from. These specs never call `detectChanges()` after the act,
 * because forcing a render is exactly what would hide the bug.
 */
describe('MnTabComponent (zoneless change detection)', () => {
  let queryParams: BehaviorSubject<ParamMap>;

  /**
   * Configures the testing module against a stubbed route whose query string starts at `params`.
   * @param params Query parameters the URL starts with.
   */
  async function configure(params: Record<string, string> = {}): Promise<void> {
    queryParams = new BehaviorSubject<ParamMap>(convertToParamMap(params));
    const route = {
      queryParamMap: queryParams.asObservable(),
      snapshot: {
        get queryParamMap(): ParamMap {
          return queryParams.value;
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate').and.resolveTo(true) },
        },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();
  }

  /** Boots the host and hands change detection to Angular's own scheduler. */
  async function render(params?: Record<string, string>): Promise<ComponentFixture<HostComponent>> {
    await configure(params);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture;
  }

  /**
   * The label of the tab currently marked selected in the DOM.
   * @param fixture The rendered host.
   */
  function selectedLabel(fixture: ComponentFixture<HostComponent>): string | undefined {
    return fixture.nativeElement
      .querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent?.trim();
  }

  it('moves the highlight when the URL names another tab', async () => {
    const fixture = await render({ tab: 'members' });
    expect(selectedLabel(fixture)).toBe('Members');

    // A back button, a deep link, or an in-app link into another tab of the page already on
    // screen: the URL moves with no click landing on this component.
    queryParams.next(convertToParamMap({ tab: 'archive' }));
    await fixture.whenStable();

    expect(selectedLabel(fixture)).toBe('Archive');
  });

  it('re-resolves the selection when the consumer replaces its items', async () => {
    const fixture = await render();
    expect(selectedLabel(fixture)).toBe('Members');

    // A consumer rebuilding its tabs — a permission check resolving, a filter narrowing the
    // set — drops the selected item, and the replacement is resolved in ngDoCheck.
    fixture.componentInstance.tabs.set({
      items: [{ id: 'archive', label: 'Archive' }],
      defaultActive: 0,
    });
    await fixture.whenStable();

    expect(selectedLabel(fixture)).toBe('Archive');
  });

  it('re-translates its labels when the language switches', async () => {
    const fixture = await render();
    const lang = TestBed.inject(MnLanguageService);
    lang.registerTranslations('en', { tabs: { members: 'Members', invites: 'Invites' } });
    lang.registerTranslations('nl', { tabs: { members: 'Leden', invites: 'Uitnodigingen' } });
    fixture.componentInstance.tabs.set({
      items: [
        { id: 'members', label: 'tabs.members' },
        { id: 'invites', label: 'tabs.invites' },
      ],
      defaultActive: 0,
    });
    await fixture.whenStable();
    expect(selectedLabel(fixture)).toBe('Members');

    // Nothing about the tabs changes, only the locale: the bar has to notice it on its own,
    // or it keeps the old language until the page is reloaded.
    await lang.setLocale('nl');
    await fixture.whenStable();

    expect(selectedLabel(fixture)).toBe('Leden');
  });
});
