import { Component} from '@angular/core';
import {MnButton, MnButtonColorDirective, MnButtonSizeDirective, MnButtonTypeDirective} from 'mn-angular-lib';

@Component({
  selector: 'app-button-demo',
  imports: [
    MnButton, MnButtonSizeDirective, MnButtonTypeDirective, MnButtonColorDirective
  ],
  templateUrl: './button-demo.html',
})
export class ButtonDemo {

}
