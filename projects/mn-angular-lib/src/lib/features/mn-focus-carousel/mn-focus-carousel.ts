import {Component, CUSTOM_ELEMENTS_SCHEMA, Input} from '@angular/core';
import {ImageProps, MnFocusCarouselTypes} from './mn-focus-carouselTypes';
import {SwiperOptions} from 'swiper/types';
import { SwiperContainer } from 'swiper/element/bundle';
import { Navigation, Pagination } from 'swiper/modules';


@Component({
  selector: 'lib-mn-focus-carousel',
  templateUrl: './mn-focus-carousel.html',
  styleUrls: ['./mn-focus-carousel.css'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MnFocusCarousel {

  images : ImageProps[] = [];
  showArrows : boolean = true;

  config = <SwiperOptions>(() => ({
    spaceBetween: 0,
    modules:[Pagination, Navigation],
    navigation: this.showArrows,
    pagination: true,
    slidesPerView: 'auto',
    loop: true,
    centeredSlides: true,
    initialSlide: 2,
  }));

  private _data!: MnFocusCarouselTypes;

  @Input() set data(value: MnFocusCarouselTypes) {
    this._data = value;
    this.images = this._data.images;
    this.showArrows = this._data.showArrows;
  }
}
