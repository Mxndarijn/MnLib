import { Component, Input } from '@angular/core';
import { ImageProps, MnFocusCarouselTypes } from './mn-focus-carouselTypes';
import { NgxSplideModule } from 'ngx-splide';
import { Options } from '@splidejs/splide';

@Component({
  selector: 'lib-mn-focus-carousel',
  templateUrl: './mn-focus-carousel.html',
  styleUrls: ['./mn-focus-carousel.css'],
  standalone: true,
  imports: [NgxSplideModule],
})
export class MnFocusCarousel {
  images: ImageProps[] = [];
  showArrows: boolean = true;

  options: Options = {
    type: 'loop',
    arrows: true,
    pagination: true,
    focus: 'center',
    updateOnMove: true,
    cloneStatus: false,
    fixedWidth: 300,
    perPage: 5,
    breakpoints: {
      1024: { perPage: 5 },
      768: { perPage: 3 },
      480: { perPage: 1 },
    },
  };

  private _data!: MnFocusCarouselTypes;

  @Input() set data(value: MnFocusCarouselTypes) {
    this._data = value;
    this.images = this._data.images;
    this.showArrows = this._data.showArrows;
    this.options = {
      ...this.options,
      arrows: this.showArrows,
    };
  }
}
