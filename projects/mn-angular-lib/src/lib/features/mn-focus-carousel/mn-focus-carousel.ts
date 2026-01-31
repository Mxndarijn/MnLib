import {Component, Input} from '@angular/core';
import {ImageProps, MnFocusCarouselTypes} from './mn-focus-carouselTypes';
import {NgxSplideModule} from 'ngx-splide';
import { Options } from '@splidejs/splide';


@Component({
  selector: 'lib-mn-focus-carousel',
  templateUrl: './mn-focus-carousel.html',
  styleUrls: ['./mn-focus-carousel.css'],
  standalone: true,
  imports: [
    NgxSplideModule
  ]
})
export class MnFocusCarousel {

  images: ImageProps[] = [];
  showArrows: boolean = true;

  options : Options = {
    type: 'loop',
    perPage: 3,
    arrows: true,
    pagination: true,
    focus: 'center' as const,
    gap: '1rem',
    breakpoints: {
      640: {
        perPage: 2,
      },
      1024: {
        perPage: 3,
      },
    },
  };

  private _data!: MnFocusCarouselTypes;

  @Input() set data(value: MnFocusCarouselTypes) {
    this._data = value;
    this.images = this._data.images;
    this.showArrows = this._data.showArrows;
    this.options = {
      ...this.options,
      arrows: this.showArrows
    };
  }
}
