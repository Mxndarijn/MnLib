import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MnBadge } from 'mn-angular-lib';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DemoExampleComponent } from '../shared/demo-example.component';

@Component({
  selector: 'app-badge-demo',
  imports: [MnBadge, DemoPageComponent, DemoExampleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './badge-demo.html',
})
export class BadgeDemo {}
