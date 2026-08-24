import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MnButton } from 'mn-angular-lib';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DemoExampleComponent } from '../shared/demo-example.component';

@Component({
  selector: 'app-button-demo',
  imports: [MnButton, DemoPageComponent, DemoExampleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './button-demo.html',
})
export class ButtonDemo {}
