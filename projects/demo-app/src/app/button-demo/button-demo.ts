import { Component} from '@angular/core';
import {MnButton, MnButtonSizeDirective, } from 'mn-angular-lib';

@Component({
  selector: 'app-button-demo',
  imports: [
    MnButton, MnButtonSizeDirective
  ],
  templateUrl: './button-demo.html',
})
export class ButtonDemo {

}
