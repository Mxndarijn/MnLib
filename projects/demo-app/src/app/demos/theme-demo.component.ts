import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemoPageComponent } from '../shared/demo-page.component';
import { MN_THEME, MnTheme } from 'mn-angular-lib';

@Component({
  selector: 'app-theme-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, DemoPageComponent],
  templateUrl: './theme-demo.component.html',
  styleUrl: './theme-demo.component.css'
})
export class ThemeDemoComponent implements OnInit {
  primary = '#0d6efd';
  radius = '0.5rem';
  padding = '0.5rem 0.75rem';

  constructor(@Inject(MN_THEME) private baseTheme: MnTheme) {
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
      this.primary = '#0d6efd';
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
