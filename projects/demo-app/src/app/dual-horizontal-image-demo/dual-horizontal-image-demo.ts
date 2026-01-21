import { Component } from '@angular/core';
import { MnDualHorizontalImage, MnDualHorizontalImageTypes } from 'mn-angular-lib';

@Component({
  selector: 'app-dual-horizontal-image-demo',
  imports: [MnDualHorizontalImage],
  templateUrl: './dual-horizontal-image-demo.html',
})
export class DualHorizontalImageDemo {
  images: MnDualHorizontalImageTypes[] = [
    { id: '1', url: 'https://images.socialdeal.nl/deal/de-combuijs-26011311385093.jpg', alt: 'Image 1' },
    { id: '2', url: 'https://images.socialdeal.nl/deal/verkeers-en-attractiepark-duinen-zathe-26011217114041.jpg', alt: 'Image 2' },
  ];
}
