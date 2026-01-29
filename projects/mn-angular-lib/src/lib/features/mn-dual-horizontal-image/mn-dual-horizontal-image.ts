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
  private _images: MnDualHorizontalImageTypes[] = [];

  @Input()
  set images(value: MnDualHorizontalImageTypes[]) {
    this._images = (value ?? []).slice(0, 2);
  }

  get images(): MnDualHorizontalImageTypes[] {
    return this._images;
  }
}
