import {Component, effect} from '@angular/core';
import { injectThemeSignal } from '../../styles';

@Component({
  selector: 'lib-test',
  imports: [  ],
  templateUrl: './test.html',
  styleUrl: './test.css',
})
export class Test {
  // Reactive theme signal; templates read via theme().primary
  theme = injectThemeSignal();

  constructor() {
    // Wanneer het theme wijzigt → update CSS variables
    effect(() => {
      const t = this.theme();
      document.documentElement.style.setProperty('--theme-primary', t.primary);
      document.documentElement.style.setProperty('--theme-radius', t.radius);
      document.documentElement.style.setProperty('--theme-padding', t.padding);
    });
  }
}
