import { Component } from '@angular/core';
import { injectThemeSignal } from '../../styles';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'lib-test',
  imports: [
    NgStyle
  ],
  templateUrl: './test.html',
  styleUrl: './test.css',
})
export class Test {
  // Reactive theme signal; templates read via theme().primary
  theme = injectThemeSignal();
}
