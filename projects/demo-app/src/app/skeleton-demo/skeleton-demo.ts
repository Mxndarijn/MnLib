import {Component} from '@angular/core';
import {MnButton, MnSkeleton} from 'mn-angular-lib';
import {DemoPageComponent} from '../shared/demo-page.component';
import {DemoExampleComponent} from '../shared/demo-example.component';

@Component({
  selector: 'app-skeleton-demo',
  standalone: true,
  imports: [MnSkeleton, MnButton, DemoPageComponent, DemoExampleComponent],
  templateUrl: './skeleton-demo.html',
})
export class SkeletonDemo {
  animated = true;
  readonly skeletonRows = [1, 2, 3];

  toggleAnimation(): void {
    this.animated = !this.animated;
  }
}
