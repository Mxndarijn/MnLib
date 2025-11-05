import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MnThemeService, Test, provideMnThemeDynamic } from 'mn-angular-lib';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, Test],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  providers: [
    // Initialize a dynamic theme at the app level; falls back to defaults for other tokens
    provideMnThemeDynamic({ primary: '#ff0000' })
  ]
})
export class AppComponent implements OnInit {
  title = 'mn-angular-lib — Theme Demo';

  // Inject the dynamic theme service
  private theme = inject(MnThemeService);

  // Two-way bound properties that proxy to the theme signal
  get primary() { return this.theme.theme().primary; }
  set primary(v: string) { this.theme.setTheme({ primary: v }); }

  get radius() { return this.theme.theme().radius; }
  set radius(v: string) { this.theme.setTheme({ radius: v }); }

  get padding() { return this.theme.theme().padding; }
  set padding(v: string) { this.theme.setTheme({ padding: v }); }

  ngOnInit(): void {
    // React to theme changes and sync CSS variables so global styles and the library use the same tokens
    effect(() => {
      const t = this.theme.theme();
      const root = document.documentElement;
      root.style.setProperty('--mn-primary', t.primary);
      root.style.setProperty('--mn-radius', t.radius);
      root.style.setProperty('--mn-padding', t.padding);
    });
  }

  usePreset(name: 'default' | 'mint' | 'sunset') {
    if (name === 'default') {
      this.theme.setTheme({
        primary: '#0d6efd',
        radius: '0.5rem',
        padding: '0.5rem 0.75rem'
      });
    } else if (name === 'mint') {
      this.theme.setTheme({
        primary: '#10b981',
        radius: '9999px',
        padding: '0.6rem 1rem'
      });
    } else if (name === 'sunset') {
      this.theme.setTheme({
        primary: '#f97316',
        radius: '0.25rem',
        padding: '0.5rem 1rem'
      });
    }
  }
}
