import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

import {MnBreadcrumbs} from './mn-breadcrumbs';
import {MnBreadcrumbItem, MnBreadcrumbsData} from './mn-breadcrumbsTypes';

/** Minimal host so the element-selector component can be driven and observed. */
@Component({
  standalone: true,
  imports: [MnBreadcrumbs],
  template: `<mn-breadcrumbs [data]="data" (crumbClick)="onCrumb($event)" (back)="onBack()"></mn-breadcrumbs>`,
})
class HostComponent {
  data: MnBreadcrumbsData = {items: []};
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
   * Clicks an element while cancelling the browser's default action, so an
   * `<a href>` fires its Angular `(click)` handler without navigating the Karma
   * page (a real navigation reloads the runner and disconnects the browser).
   */
  const clickNoNav = (el: HTMLElement): void => {
    el.addEventListener('click', (e) => e.preventDefault(), {once: true});
    el.click();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('renders a labelled navigation landmark', () => {
    fixture.detectChanges();
    expect(root().getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('renders one crumb per item with separators between them', () => {
    host.data = {items: [{label: 'Home', href: '/'}, {label: 'Library', href: '/lib'}, {label: 'Current'}]};
    fixture.detectChanges();

    expect(crumbs().length).toBe(3);
    // Separators sit between crumbs only: N crumbs ⇒ N-1 separators.
    expect(separators().length).toBe(2);
  });

  it('marks the last crumb as the current page and never a link', () => {
    host.data = {items: [{label: 'Home', href: '/'}, {label: 'Current'}]};
    fixture.detectChanges();

    const last = crumbs()[1].querySelector('span[aria-current="page"]');
    expect(last).not.toBeNull();
    expect(crumbs()[1].querySelector('a, button')).toBeNull();
  });

  it('renders a linked crumb as an anchor carrying its href', () => {
    host.data = {items: [{label: 'Home', href: '/home'}, {label: 'Current'}]};
    fixture.detectChanges();

    const anchor = crumbs()[0].querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute('href')).toBe('/home');
  });

  it('emits crumbClick and runs the crumb callback on click', () => {
    const spy = jasmine.createSpy('onClick');
    host.data = {items: [{label: 'Home', onClick: spy}, {label: 'Current'}]};
    fixture.detectChanges();

    crumbs()[0].querySelector('button')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(host.clicked).toBe(host.data.items[0]);
  });

  it('degrades to a Back control when no crumbs are given', () => {
    host.data = {items: []};
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ol')).toBeNull();
    expect(backControl()).not.toBeNull();
  });

  it('renders the Back control as an anchor when a backHref is set', () => {
    host.data = {items: [], backHref: '/parent'};
    fixture.detectChanges();

    const control = backControl();
    expect(control?.tagName).toBe('A');
    expect(control?.getAttribute('href')).toBe('/parent');
  });

  it('emits back without touching history when a backHref is set', () => {
    const backSpy = spyOn(window.history, 'back');
    host.data = {items: [], backHref: '/parent'};
    fixture.detectChanges();

    clickNoNav(backControl()!);
    expect(host.backCount).toBe(1);
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('emits back and steps through history when no backHref is set', () => {
    const backSpy = spyOn(window.history, 'back');
    host.data = {items: []};
    fixture.detectChanges();

    backControl()!.click();
    expect(host.backCount).toBe(1);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });
});
