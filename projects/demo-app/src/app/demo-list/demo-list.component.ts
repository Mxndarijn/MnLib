import {Component} from '@angular/core';

import {RouterLink} from '@angular/router';
import {MnButton} from 'mn-angular-lib';

interface DemoItem {
  title: string;
  path: string;
  description?: string;
}

@Component({
  selector: 'app-demo-list',
  standalone: true,
  imports: [RouterLink, MnButton],
  templateUrl: './demo-list.component.html',
  styles: [`
    .demo-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
    .demo-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--color-base-200); border: 1px solid var(--color-base-300); border-radius: var(--mn-radius); transition: background 0.2s, border-color 0.2s; }
    .title { font-weight: 600; color: var(--color-base-content); }
    .desc { color: var(--color-base-content); opacity: 0.6; font-size: 12px; }
  `]
})
export class DemoListComponent {
  demos: DemoItem[] = [
    { title: 'Alerts Demo', path: '/demos/alerts', description: 'Showcase mn-alert service, providers, and outlet template.' },
    { title: 'Button Demo', path: '/demos/button-demo', description: 'Buttons with sizes, variants, and colors.' },
    { title: 'Config Demo', path: '/demos/config', description: 'mn-config with section scoping, component defaults, and instance overrides.' },
    { title: 'DualHorizontalImage Demo', path: '/demos/dual-horizontal-image-demo', description: 'Two images shown horizontally.' },
    { title: 'Information card Demo', path: '/demos/information-card-demo', description: 'Information card with title, description and optional images.' },
    {title: 'Input field demo', path: '/demos/input-field-demo', description: 'Input field demo'},
    {title: 'Textarea demo', path: '/demos/textarea-demo', description: 'Textarea with configurable rows, cols, resize, and error handling.'},
    {title: 'Modal demo', path: '/demos/modal-demo', description: 'Modal system with wizard, form, confirmation, and custom variants.'},
    {title: 'Table demo', path: '/demos/table-demo', description: 'Generic table with sorting, selection, row actions, search, and pagination.'},
    {title: 'Language demo', path: '/demos/language-demo', description: 'Language service with locale switching, translate pipe, interpolation, and config integration.'},
    {title: 'Calendar demo', path: '/demos/calendar-demo', description: 'Calendar with week, day, and month views, event layout, upcoming events sidebar, and pluggable event renderers.'},
    {title: 'List demo', path: '/demos/list-demo', description: 'Generic list with search, selection, load more, pagination, and custom item templates.'},
    {
      title: 'Datetime demo',
      path: '/demos/datetime-demo',
      description: 'Datetime input with date, time, and datetime-local modes, variants, and validation.'
    },
    {
      title: 'Select demo',
      path: '/demos/select-demo',
      description: 'Native browser select with ControlValueAccessor, validation, disabled options, and styling variants.'
    }
  ];
}
