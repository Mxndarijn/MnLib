import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'theme-toggle',
  standalone: true,
  template: `
    <button
      (click)="toggle()"
      class="theme-toggle"
      [attr.aria-label]="'Switch to ' + (isDark ? 'light' : 'dark') + ' theme'"
      [title]="'Switch to ' + (isDark ? 'light' : 'dark') + ' theme'"
    >
      @if (isDark) {
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      } @else {
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      }
    </button>
  `,
  styles: [`
    .theme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid var(--color-base-300);
      background: var(--color-base-200);
      color: var(--color-base-content);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .theme-toggle:hover {
      background: var(--color-base-300);
    }
  `]
})
export class ThemeToggleComponent implements OnInit {
  isDark = true;

  ngOnInit(): void {
    const saved = document.documentElement.getAttribute('data-theme');
    this.isDark = saved === 'dark';
  }

  toggle(): void {
    this.isDark = !this.isDark;
    document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
  }
}
