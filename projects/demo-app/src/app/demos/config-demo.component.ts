import { Component } from '@angular/core';
import { MnSectionDirective, MnInstanceDirective, MnTestComponent } from 'mn-angular-lib';

@Component({
  selector: 'app-config-demo',
  standalone: true,
  imports: [MnSectionDirective, MnInstanceDirective, MnTestComponent],
  template: `
    <div class="container" mn-section="root">
      <h1>mn-config Demo</h1>
      <p>This page demonstrates defaults, section overrides, and instance overrides.</p>
      <section>
        <h2>Section 0 (default)</h2>
        <div mn-section="section-0">
          <!-- This instance matches the overrides['root']['section-a']['#header-text'] node -->
          <mn-test-component></mn-test-component>
        </div>
      </section>
      <section>
        <h2>Section A (instance override via #header-text)</h2>
        <div mn-section="section-a">
          <!-- This instance matches the overrides['root']['section-a']['#header-text'] node -->
          <mn-test-component mn-instance="header-text"></mn-test-component>
        </div>
      </section>

      <section>
        <h2>Section B (component override sets color: blue)</h2>
        <div mn-section="section-b">
          <!-- This matches overrides['root']['section-b']['test-component'] -->
          <mn-test-component></mn-test-component>
        </div>
      </section>

      <section>
        <h2>Section A (instance override via #header-text and normal)</h2>
        <div mn-section="section-a">
          <!-- This instance matches the overrides['root']['section-a']['#header-text'] node -->
          <mn-test-component mn-instance="header-text"></mn-test-component>
          <mn-test-component></mn-test-component>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .container { display: grid; gap: 16px; }
    h1 { margin: 0 0 8px; }
    section { padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
    h2 { margin-top: 0; font-size: 16px; }
  `]
})
export class ConfigDemoComponent {}
