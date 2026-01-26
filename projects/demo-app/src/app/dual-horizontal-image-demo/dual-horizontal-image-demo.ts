import { Component } from '@angular/core';
import { MnDualHorizontalImage, MnDualHorizontalImageTypes } from 'mn-angular-lib';

@Component({
  selector: 'app-dual-horizontal-image-demo',
  imports: [MnDualHorizontalImage],
  templateUrl: './dual-horizontal-image-demo.html',
})
export class DualHorizontalImageDemo {
  images: MnDualHorizontalImageTypes[] = [
    { id: '1', url: 'https://images.socialdeal.nl/img/dp-dynamicbanner-mobile-sd-awards-hotel.jpg', alt: 'Image 1' },
    { id: '2', url: 'https://images.socialdeal.nl/img/dp-img3-hotel-cozykamer.jpg', alt: 'Image 2' },
  ];
}
