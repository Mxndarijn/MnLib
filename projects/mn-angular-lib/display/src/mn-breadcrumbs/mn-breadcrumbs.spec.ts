import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MnLanguageService } from 'mn-angular-lib/core';
import { MnBreadcrumbs } from './mn-breadcrumbs';
import { MnBreadcrumbItem, MnBreadcrumbsData } from './mn-breadcrumbsTypes';

/** Minimal host so the element-selector component can be driven and observed. */
@Component({
  standalone: true,
  imports: [MnBreadcrumbs],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<mn-breadcrumbs
    [data]="data"
    (crumbClick)="onCrumb($event)"
    (back)="onBack()"
  ></mn-breadcrumbs>`,
})
class HostComponent {
  data: MnBreadcrumbsData = { items: [] };
  clicked?: MnBreadcrumbItem;
  backCount = 0;

  onCrumb(item: MnBreadcrumbItem): void {
    this.clicked = item;
  }

  onBack(): void {
    this.backCount++;
  }
}

describe('MnBreadcrumbs', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const root = (): HTMLElement => fixture.nativeElement.querySelector('nav');
  const crumbs = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('ol > li:not([aria-hidden])'));
  const separators = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('ol > li[aria-hidden]'));
  const backControl = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('nav > a, nav > button');
  /**
   * The narrow-screen stand-in for the trail: the parent crumb, which renders
   * beside the `ol` rather than instead of it, so CSS alone decides which shows.
   */
  const collapsed = (): HTMLElement | null =>
    fixture.nativeElement.querySelector(
      'nav > a[class*="sm:hidden"], nav > button[class*="sm:hidden"]',
    );

  /**
   * Clicks an element while cancelling the browser's default action, so an
   * `<a href>` fires its Angular `(click)` handler without navigating the Karma
   * page (a real navigation reloads the runner and disconnects the browser).
   */
  const clickNoNav = (el: HTMLElement): void => {
    el.addEventListener('click', (e) => e.preventDefault(), { once: true });
    el.click();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('renders a labelled navigation landmark', () => {
    fixture.detectChanges();
    expect(root().getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('renders one crumb per item with separators between them', () => {
    host.data = {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Library', href: '/lib' },
        { label: 'Current' },
      ],
    };
    fixture.detectChanges();

    expect(crumbs().length).toBe(3);
    // Separators sit between crumbs only: N crumbs ⇒ N-1 separators.
    expect(separators().length).toBe(2);
  });

  it('marks the last crumb as the current page and never a link', () => {
    host.data = { items: [{ label: 'Home', href: '/' }, { label: 'Current' }] };
    fixture.detectChanges();

    const last = crumbs()[1].querySelector('span[aria-current="page"]');
    expect(last).not.toBeNull();
    expect(crumbs()[1].querySelector('a, button')).toBeNull();
  });

  it('renders a linked crumb as an anchor carrying its href', () => {
    host.data = { items: [{ label: 'Home', href: '/home' }, { label: 'Current' }] };
    fixture.detectChanges();

    const anchor = crumbs()[0].querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute('href')).toBe('/home');
  });

  it('emits crumbClick and runs the crumb callback on click', () => {
    const spy = jasmine.createSpy('onClick');
    host.data = { items: [{ label: 'Home', onClick: spy }, { label: 'Current' }] };
    fixture.detectChanges();

    crumbs()[0].querySelector('button')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(host.clicked).toBe(host.data.items[0]);
  });

  it('offers the parent crumb as a collapsed control, hidden from sm up', () => {
    host.data = {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Library', href: '/lib' },
        { label: 'Current' },
      ],
    };
    fixture.detectChanges();

    // The trail itself only exists from `sm`; below it the parent takes over.
    expect(fixture.nativeElement.querySelector('ol')!.className).toContain('hidden');
    expect(fixture.nativeElement.querySelector('ol')!.className).toContain('sm:flex');
    expect(collapsed()!.textContent!.trim()).toBe('Library');
    expect(collapsed()!.getAttribute('href')).toBe('/lib');
  });

  it('emits crumbClick for the parent when the collapsed control is used', () => {
    const spy = jasmine.createSpy('onClick');
    host.data = {
      items: [{ label: 'Home' }, { label: 'Library', onClick: spy }, { label: 'Current' }],
    };
    fixture.detectChanges();

    collapsed()!.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(host.clicked).toBe(host.data.items[1]);
  });

  it('keeps every crumb at every width when collapse is never', () => {
    host.data = {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Library', href: '/lib' },
        { label: 'Current' },
      ],
      collapse: 'never',
    };
    fixture.detectChanges();

    expect(collapsed()).toBeNull();
    expect(fixture.nativeElement.querySelector('ol')!.className).not.toContain('hidden');
  });

  it('leaves a single-crumb trail whole: there is nowhere to go up to', () => {
    host.data = { items: [{ label: 'Current' }] };
    fixture.detectChanges();

    expect(collapsed()).toBeNull();
    expect(crumbs().length).toBe(1);
  });

  it('degrades to a Back control when no crumbs are given', () => {
    host.data = { items: [] };
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ol')).toBeNull();
    expect(backControl()).not.toBeNull();
  });

  it('renders the Back control as an anchor when a backHref is set', () => {
    host.data = { items: [], backHref: '/parent' };
    fixture.detectChanges();

    const control = backControl();
    expect(control?.tagName).toBe('A');
    expect(control?.getAttribute('href')).toBe('/parent');
  });

  it('emits back without touching history when a backHref is set', () => {
    const backSpy = spyOn(window.history, 'back');
    host.data = { items: [], backHref: '/parent' };
    fixture.detectChanges();

    clickNoNav(backControl()!);
    expect(host.backCount).toBe(1);
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('emits back and steps through history when no backHref is set', () => {
    const backSpy = spyOn(window.history, 'back');
    host.data = { items: [] };
    fixture.detectChanges();

    backControl()!.click();
    expect(host.backCount).toBe(1);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  // The two strings this component renders on its own behalf. Both used to be
  // untranslatable: the landmark name was a hardcoded "Breadcrumb" in the template,
  // and the Back control defaulted to the bare key `back`, which the translate pipe
  // echoed verbatim as lowercase "back" in any app that had not defined it.
  it('labels the Back control in English when no key is defined', () => {
    host.data = { items: [] };
    fixture.detectChanges();

    expect(backControl()!.textContent!.trim()).toBe('Back');
  });

  it('translates the landmark and the Back control through their conventional keys', () => {
    TestBed.inject(MnLanguageService).registerTranslations('en', {
      'mnBreadcrumbs.label': 'Kruimelpad',
      'mnBreadcrumbs.back': 'Terug',
    });
    host.data = { items: [] };
    fixture.detectChanges();

    expect(root().getAttribute('aria-label')).toBe('Kruimelpad');
    expect(backControl()!.textContent!.trim()).toBe('Terug');
  });

  it('translates a caller-supplied backLabel key, and passes a literal through', () => {
    TestBed.inject(MnLanguageService).registerTranslations('en', { 'nav.parent': 'Naar boven' });

    host.data = { items: [], backLabel: 'nav.parent' };
    fixture.detectChanges();
    expect(backControl()!.textContent!.trim()).toBe('Naar boven');

    host.data = { items: [], backLabel: 'Overzicht' };
    fixture.detectChanges();
    expect(backControl()!.textContent!.trim()).toBe('Overzicht');
  });

  describe('text crumbs', () => {
    /**
     * A record's own name (a meeting's title) has no translation key. Passed as a `label` it
     * was looked up as one and logged a missing translation on every render; `text` is shown
     * as is and never looked up.
     */
    it('renders a text crumb as is, without a missing-translation warning', () => {
      const lang = TestBed.inject(MnLanguageService);
      lang.registerTranslations('en', { meetings: { title: 'Meetings' } });
      lang.setDebug(true);
      const warn = spyOn(console, 'warn');

      host.data = {
        items: [
          { label: 'meetings.title', href: '/meetings' },
          { text: 'Bestuursvergadering deze maand' },
        ],
      };
      fixture.detectChanges();

      expect(crumbs().map((crumb) => crumb.textContent!.trim())).toEqual([
        'Meetings',
        'Bestuursvergadering deze maand',
      ]);
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not translate a text crumb, even when it matches a key', () => {
      TestBed.inject(MnLanguageService).registerTranslations('en', { Agenda: 'Vertaald' });
      host.data = { items: [{ label: 'Home', href: '/' }, { text: 'Agenda' }] };
      fixture.detectChanges();

      expect(crumbs()[1].textContent!.trim()).toBe('Agenda');
    });

    it('uses a text parent as the narrow-screen back control', () => {
      host.data = {
        items: [{ text: 'Landelijke Open Dag', href: '/matches/1' }, { label: 'Current' }],
      };
      fixture.detectChanges();

      expect(collapsed()!.textContent!.trim()).toBe('Landelijke Open Dag');
    });
  });
});
