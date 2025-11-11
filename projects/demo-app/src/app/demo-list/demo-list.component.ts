import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface DemoItem {
  title: string;
  path: string;
  description?: string;
}

@Component({
  selector: 'app-demo-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './demo-list.component.html',
  styles: [`
    .demo-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
    .demo-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: var(--mn-radius); }
    .title { font-weight: 600; }
    .desc { color: #555; font-size: 12px; }
    .mn-btn { -webkit-appearance: none; appearance: none; cursor: pointer; background: var(--mn-primary); color: #fff; border: 1px solid var(--mn-primary); border-radius: var(--mn-radius); padding: var(--mn-padding); text-decoration: none; }
  `]
})
export class DemoListComponent {
  demos: DemoItem[] = [
    { title: 'Theme Demo', path: '/demos/theme', description: 'Play with theme tokens: primary, radius, padding.' },
    { title: 'Alerts Demo', path: '/demos/alerts', description: 'Showcase mn-alert service, providers, and outlet template.' },
    { title: 'Button Demo', path: '/demos/button-demo', description: 'Button watermelon' }
  ];
}
