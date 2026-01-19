import { Component} from '@angular/core';
import {MnButton } from 'mn-angular-lib';

@Component({
  selector: 'app-button-demo',
  imports: [
    MnButton
  ],
  templateUrl: './button-demo.html',
})
export class ButtonDemo {

  protected readonly alert = alert;
}
