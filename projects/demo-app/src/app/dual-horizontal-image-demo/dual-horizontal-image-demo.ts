import { Component } from '@angular/core';
import {MnDualHorizontalImage} from 'mn-angular-lib';
import {DemoPageComponent} from '../shared/demo-page.component';
import {DemoExampleComponent} from '../shared/demo-example.component';

@Component({
  selector: 'app-dual-horizontal-image-demo',
  imports: [MnDualHorizontalImage, DemoPageComponent, DemoExampleComponent],
  templateUrl: './dual-horizontal-image-demo.html',
})
export class DualHorizontalImageDemo {
}
