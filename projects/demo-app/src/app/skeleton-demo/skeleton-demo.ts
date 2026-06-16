import {Component} from '@angular/core';
import {MnButton, MnSkeleton} from 'mn-angular-lib';

@Component({
  selector: 'app-skeleton-demo',
  standalone: true,
  imports: [MnSkeleton, MnButton],
  templateUrl: './skeleton-demo.html',
})
export class SkeletonDemo {
  animated = true;
  readonly skeletonRows = [1, 2, 3];

  toggleAnimation(): void {
    this.animated = !this.animated;
  }
}
