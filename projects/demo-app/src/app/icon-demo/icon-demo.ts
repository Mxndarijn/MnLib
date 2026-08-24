import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MnIcon, MnIconAttributes } from 'mn-angular-lib';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DemoExampleComponent } from '../shared/demo-example.component';

@Component({
  selector: 'app-icon-demo',
  imports: [MnIcon, MnIconAttributes, DemoPageComponent, DemoExampleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './icon-demo.html',
})
export class IconDemo {}
