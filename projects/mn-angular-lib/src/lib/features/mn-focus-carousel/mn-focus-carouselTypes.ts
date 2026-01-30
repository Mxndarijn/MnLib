export interface ImageProps {
  src: string;
  alt: string;
  id: number;
}

export interface MnFocusCarouselTypes {
  images: ImageProps[];
  showArrows: boolean;
}
