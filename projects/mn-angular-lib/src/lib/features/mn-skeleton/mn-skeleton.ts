import {Component, HostBinding, Input} from '@angular/core';
import {MnSkeletonProps} from './mn-skeletonTypes';
import {mnSkeletonVariants} from './mn-skeletonVariants';

@Component({
  selector: 'mn-skeleton',
  standalone: true,
  templateUrl: './mn-skeleton.html',
  styleUrls: ['./mn-skeleton.css'],
})
export class MnSkeleton {
  @Input() data: Partial<MnSkeletonProps> = {};

  // Skeletons are decorative loading placeholders; hide them from assistive tech.
  // The container that swaps skeleton↔content should carry aria-busy / a live region.
  @HostBinding('attr.aria-hidden') readonly ariaHidden = 'true';

  @HostBinding('class')
  get hostClasses(): string {
    return mnSkeletonVariants({shape: this.data.shape});
  }

  @HostBinding('style.width')
  get width(): string | null {
    return this.data.width ?? null;
  }

  @HostBinding('style.height')
  get height(): string | null {
    return this.data.height ?? null;
  }

  get isAnimated(): boolean {
    return this.data.animated !== false;
  }
}
