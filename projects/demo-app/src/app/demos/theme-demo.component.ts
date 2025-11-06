import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemoPageComponent } from '../shared/demo-page.component';
import { injectThemeSignal, MnThemeService, Test } from 'mn-angular-lib';

@Component({
  selector: 'app-theme-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, DemoPageComponent, Test],
  templateUrl: './theme-demo.component.html',
  styleUrl: './theme-demo.component.css'
})
export class ThemeDemoComponent implements OnInit {
  title = 'mn-angular-lib — Theme Demo';

  // Active editable tokens bound to the controls
  primary = '#0d6efd';
  radius = '0.5rem';
  padding = '0.5rem 0.75rem';

  // Keep last applied values so we can update only the changed key
  private prevPrimary = this.primary;
  private prevRadius = this.radius;
  private prevPadding = this.padding;

  private theme = injectThemeSignal();
  private themeService = inject(MnThemeService);

  ngOnInit(): void {
    // Initialize local controls from the current theme if available
    const t = this.theme();
    if (t) {
      this.primary = t.primary ?? this.primary;
      this.radius = t.radius ?? this.radius;
      this.padding = t.padding ?? this.padding;

      this.prevPrimary = this.primary;
      this.prevRadius = this.radius;
      this.prevPadding = this.padding;
    }
  }

  // Called on each input change; updates only the changed token
  applyThemeToCssVars(): void {
    if (this.primary !== this.prevPrimary) {
      this.themeService.setTheme({ primary: this.primary });
      this.prevPrimary = this.primary;
    } else if (this.radius !== this.prevRadius) {
      this.themeService.setTheme({ radius: this.radius });
      this.prevRadius = this.radius;
    } else if (this.padding !== this.prevPadding) {
      this.themeService.setTheme({ padding: this.padding });
      this.prevPadding = this.padding;
    }
  }

  usePreset(name: 'default' | 'mint' | 'sunset') {
    if (name === 'default') {
      this.themeService.reset();
      // Sync local controls with reset theme values (fall back to defaults)
      const t = this.theme();
      this.primary = t?.primary ?? '#0d6efd';
      this.radius = t?.radius ?? '0.5rem';
      this.padding = t?.padding ?? '0.5rem 0.75rem';
    } else if (name === 'mint') {
      this.themeService.setTheme({
        primary: '#10b981',
        radius: '9999px',
        padding: '0.6rem 1rem'
      });
      this.primary = '#10b981';
      this.radius = '9999px';
      this.padding = '0.6rem 1rem';
    } else if (name === 'sunset') {
      this.themeService.setTheme({
        primary: '#f97316',
        radius: '0.25rem',
        padding: '0.5rem 1rem'
      });
      this.primary = '#f97316';
      this.radius = '0.25rem';
      this.padding = '0.5rem 1rem';
    }

    // Update previous trackers after presets
    this.prevPrimary = this.primary;
    this.prevRadius = this.radius;
    this.prevPadding = this.padding;
  }
}
