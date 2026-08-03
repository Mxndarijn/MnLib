import { Component } from '@angular/core';
import { MnSectionDirective } from 'mn-angular-lib';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DemoExampleComponent } from '../shared/demo-example.component';

@Component({
  selector: 'app-config-demo',
  standalone: true,
  imports: [MnSectionDirective, DemoPageComponent, DemoExampleComponent],
  template: `
    <app-demo-page
      mn-section="root"
      title="Config"
      tag="MnConfigService"
      lead="This page demonstrates defaults, section overrides, and instance overrides."
    ></app-demo-page>
  `,
  styles: [`
    h1 { margin: 0 0 8px; }
  `]
})
export class ConfigDemoComponent {}
