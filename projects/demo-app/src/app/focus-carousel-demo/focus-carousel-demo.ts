import {Component} from '@angular/core';
import {MnFocusCarousel, MnFocusCarouselTypes} from 'mn-angular-lib';

@Component({
  selector: 'app-focus-carousel-demo',
  imports: [MnFocusCarousel],
  templateUrl: './focus-carousel-demo.html',
})
export class FocusCarouselDemo {
  data: MnFocusCarouselTypes = {
    images: [
      { id: 1, src: 'https://images.socialdeal.nl/img/dp-dynamicbanner-mobile-sd-awards-hotel.jpg', alt: 'Image 1' },
      { id: 2, src: 'https://images.socialdeal.nl/img/dp-img3-hotel-cozykamer.jpg', alt: 'Image 2' }
    ],
    showArrows: true
  };
  protected readonly JSON = JSON;
}
