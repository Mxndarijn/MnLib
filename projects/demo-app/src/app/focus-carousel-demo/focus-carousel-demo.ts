import { Component } from '@angular/core';
import { MnFocusCarousel, MnFocusCarouselTypes } from 'mn-angular-lib';

@Component({
  selector: 'app-focus-carousel-demo',
  imports: [MnFocusCarousel],
  templateUrl: './focus-carousel-demo.html',
})
export class FocusCarouselDemo {
  data: MnFocusCarouselTypes = {
    images: [
      {
        id: 1,
        src: 'https://images.photowall.com/products/47782/extreme-skiing.jpg?h=699&q=85',
        alt: 'Image 1',
      },
      {
        id: 2,
        src: 'https://hotel-kaya.com/assets/uploads/2022/06/regles-ski-alpin.jpg',
        alt: 'Image 2',
      },
      {
        id: 3,
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ski_Famille_-_Family_Ski_Holidays.jpg/500px-Ski_Famille_-_Family_Ski_Holidays.jpg',
        alt: 'Image 3',
      },
    ],
    showArrows: true,
  };
}
