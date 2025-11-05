import {Component, inject} from '@angular/core';
import {MN_THEME, MnTheme} from "mn-angular-lib";
import {NgStyle} from '@angular/common';

@Component({
  selector: 'lib-test',
  imports: [
    NgStyle
  ],
  templateUrl: './test.html',
  styleUrl: './test.css',
})
export class Test {
  theme: MnTheme = inject(MN_THEME);
}
