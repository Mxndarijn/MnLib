import { Component } from '@angular/core';
import { MnSectionDirective, MnInstanceDirective } from 'mn-angular-lib';

@Component({
  selector: 'app-config-demo',
  standalone: true,
  imports: [MnSectionDirective, MnInstanceDirective],
  template: `
    <div class="container" mn-section="root">
      <h1>mn-config Demo</h1>
      <p>This page demonstrates defaults, section overrides, and instance overrides.</p>
    </div>
  `,
  styles: [`
    .container { display: grid; gap: 16px; }
    h1 { margin: 0 0 8px; }
  `]
})
export class ConfigDemoComponent {}
