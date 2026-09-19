import { Component } from '@angular/core';
import { MnBreadcrumbs, MnBreadcrumbItem, MnBreadcrumbsData } from 'mn-angular-lib';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DemoExampleComponent } from '../shared/demo-example.component';

@Component({
  selector: 'app-breadcrumbs-demo',
  standalone: true,
  imports: [MnBreadcrumbs, DemoPageComponent, DemoExampleComponent],
  templateUrl: './breadcrumbs-demo.html',
})
export class BreadcrumbsDemo {
  /** A full linkable trail; the last crumb is the current page. */
  trail: MnBreadcrumbsData = {
    items: [
      { label: 'Home', href: '#/demos' },
      { label: 'Components', href: '#/demos' },
      { label: 'Breadcrumbs' },
    ],
  };

  /** Same trail driven by click callbacks instead of hrefs (SPA-style). */
  clickTrail: MnBreadcrumbsData = {
    items: [
      { label: 'Home', onClick: () => console.log('go home') },
      { label: 'Library', onClick: () => console.log('go library') },
      { label: 'Current page' },
    ],
  };

  /** Back fallback with an explicit target. */
  backWithLink: MnBreadcrumbsData = {
    items: [],
    backHref: '#/demos',
    backLabel: 'Back to demos',
  };

  /** Back fallback with no target — falls back to browser history. */
  backAuto: MnBreadcrumbsData = { items: [] };

  /** A deep trail, to show what a narrow screen keeps: the parent crumb only. */
  deepTrail: MnBreadcrumbsData = {
    items: [
      { label: 'Meetings', href: '#/demos' },
      { label: 'Board meeting this month', href: '#/demos' },
      { label: 'Agenda' },
    ],
  };

  /** The same deep trail, kept whole at every width. */
  deepTrailWhole: MnBreadcrumbsData = { ...this.deepTrail, collapse: 'never' };

  onCrumb(item: MnBreadcrumbItem): void {
    console.log('crumb clicked:', item.label);
  }

  onBack(): void {
    console.log('back clicked');
  }
}
