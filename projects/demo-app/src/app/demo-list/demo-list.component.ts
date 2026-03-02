import { Component } from '@angular/core';

import { RouterLink } from '@angular/router';
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
    .demo-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: var(--mn-radius); }
    .title { font-weight: 600; }
    .desc { color: #555; font-size: 12px; }
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
    {title: 'Textarea demo', path: '/demos/textarea-demo', description: 'Textarea with configurable rows, cols, resize, and error handling.'}
  ];
}
