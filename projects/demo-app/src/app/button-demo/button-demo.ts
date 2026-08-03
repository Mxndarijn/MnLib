import { Component} from '@angular/core';
import {MnButton } from 'mn-angular-lib';
import {DemoPageComponent} from '../shared/demo-page.component';
import {DemoExampleComponent} from '../shared/demo-example.component';

@Component({
  selector: 'app-button-demo',
  imports: [
    MnButton,
    DemoPageComponent,
    DemoExampleComponent
  ],
  templateUrl: './button-demo.html',
})
export class ButtonDemo {

}
