import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {injectThemeSignal, MnThemeService, Test} from 'mn-angular-lib';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, Test],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'mn-angular-lib — Theme Demo';

  private theme = injectThemeSignal();
  private themeService = inject(MnThemeService);


  ngOnInit(): void {
  }

  usePreset(name: 'default' | 'mint' | 'sunset') {
    if (name === 'default') {
      this.themeService.reset();
    } else if (name === 'mint') {
      this.themeService.setTheme({
        primary: '#10b981',
        radius: '9999px',
        padding: '0.6rem 1rem'
      });
    } else if (name === 'sunset') {
      this.themeService.setTheme({
        primary: '#f97316',
        radius: '0.25rem',
        padding: '0.5rem 1rem'
      });
    }
  }
}
