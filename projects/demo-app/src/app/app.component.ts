import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MN_THEME, MnTheme,  } from 'mn-angular-lib';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="container">
  <div class="header">
    <h1>{{ title }}</h1>
    <div class="controls">
      <button class="mn-btn" (click)="usePreset('default')">Default</button>
      <button class="mn-btn" (click)="usePreset('mint')">Mint</button>
      <button class="mn-btn" (click)="usePreset('sunset')">Sunset</button>
    </div>
  </div>

  <section class="controls">
    <label>
      Primary:
      <input type="color" [(ngModel)]="primary" (input)="applyThemeToCssVars()" />
    </label>
    <label>
      Radius:
      <input type="text" [(ngModel)]="radius" (input)="applyThemeToCssVars()" placeholder="e.g. 0.5rem or 8px" />
    </label>
    <label>
      Padding:
      <input type="text" [(ngModel)]="padding" (input)="applyThemeToCssVars()" placeholder="e.g. 0.5rem 0.75rem" />
    </label>
  </section>
  <lib-test></lib-test>

  <section class="preview">
    <div class="card">
      <h3>Card header</h3>
      <p>Uses <code>--mn-radius</code> and <code>--mn-padding</code>.</p>
      <div class="actions">
        <button class="mn-btn">Primary Button</button>
        <button class="mn-btn outline">Outline Button</button>
      </div>
    </div>

    <div class="chip">Chip</div>

    <div class="alert">
      <strong>Alert:</strong> this is a themed alert using <code>--mn-primary</code>.
    </div>
  </section>

  <section class="tokens">
    <div>
      <strong>--mn-primary:</strong> <span class="swatch" [style.background]="primary"></span> {{ primary }}
    </div>
    <div>
      <strong>--mn-radius:</strong> {{ radius }}
    </div>
    <div>
      <strong>--mn-padding:</strong> {{ padding }}
    </div>
  </section>
</div>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'mn-angular-lib — Theme Demo';

  primary = '#0d6efd';
  radius = '0.5rem';
  padding = '0.5rem 0.75rem';

  constructor(@Inject(MN_THEME) private baseTheme: MnTheme) {
    // Initialize from injected theme defaults
    this.primary = baseTheme.primary;
    this.radius = baseTheme.radius;
    this.padding = baseTheme.padding;
  }

  ngOnInit(): void {
    this.applyThemeToCssVars();
  }

  applyThemeToCssVars() {
    const root = document.documentElement;
    root.style.setProperty('--mn-primary', this.primary);
    root.style.setProperty('--mn-radius', this.radius);
    root.style.setProperty('--mn-padding', this.padding);
  }

  usePreset(name: 'default' | 'mint' | 'sunset') {
    if (name === 'default') {
      this.radius = '0.5rem';
      this.padding = '0.5rem 0.75rem';
    } else if (name === 'mint') {
      this.primary = '#10b981';
      this.radius = '9999px';
      this.padding = '0.6rem 1rem';
    } else if (name === 'sunset') {
      this.primary = '#f97316';
      this.radius = '0.25rem';
      this.padding = '0.5rem 1rem';
    }
    this.applyThemeToCssVars();
  }
}
