import { Component } from '@angular/core';
import { MnIcon, MnIconAttributes } from 'mn-angular-lib';
import {DemoPageComponent} from '../shared/demo-page.component';
import {DemoExampleComponent} from '../shared/demo-example.component';

@Component({
  selector: 'app-icon-demo',
  imports: [
    MnIcon,
    MnIconAttributes,
    DemoPageComponent,
    DemoExampleComponent
  ],
  templateUrl: './icon-demo.html',
})
export class IconDemo {

}
