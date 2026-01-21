import {Component, Input} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import { MnDualHorizontalImageTypes } from './mn-dual-horizontal-imageTypes';

@Component({
  selector: 'lib-mn-dual-horizontal-image',
  standalone: true,
  imports: [
    NgOptimizedImage
  ],
  templateUrl: './mn-dual-horizontal-image.html',
})
export class MnDualHorizontalImage {
  @Input() images: MnDualHorizontalImageTypes[] = [];
}
