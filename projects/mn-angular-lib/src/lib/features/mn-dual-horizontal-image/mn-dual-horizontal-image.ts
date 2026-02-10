import {Component, inject, InjectionToken, Input} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import { MnDualHorizontalImageTypes } from './mn-dual-horizontal-imageTypes';
import {provideMnComponentConfig} from '../../config';

export interface MnDualHorizontalImageConfig {
  images?: MnDualHorizontalImageTypes[]
}

export const MN_LIB_DUAL_HORIZONTAL_IMAGE = new InjectionToken<MnDualHorizontalImageConfig>('MN_LIB_DUAL_HORIZONTAL_IMAGE');


@Component({
  selector: 'lib-mn-dual-horizontal-image',
  standalone: true,
  imports: [
    NgOptimizedImage
  ],
  providers: [
    provideMnComponentConfig<MnDualHorizontalImageConfig>(MN_LIB_DUAL_HORIZONTAL_IMAGE, 'mn-dual-horizontal-image'),
  ],
  templateUrl: './mn-dual-horizontal-image.html',
  host: {
    class: 'block'
  }
})
export class MnDualHorizontalImage {
  protected readonly componentConfig = inject(MN_LIB_DUAL_HORIZONTAL_IMAGE);
}
