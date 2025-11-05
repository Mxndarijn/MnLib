import {Component, inject} from '@angular/core';
import {injectTheme, MnTheme} from '../../styles';
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
  theme: MnTheme = injectTheme();
}
