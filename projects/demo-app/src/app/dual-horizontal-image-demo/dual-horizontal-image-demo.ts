import { Component } from '@angular/core';
import { MnDualHorizontalImage, MnDualHorizontalImageTypes } from 'mn-angular-lib';

@Component({
  selector: 'app-dual-horizontal-image-demo',
  imports: [MnDualHorizontalImage],
  templateUrl: './dual-horizontal-image-demo.html',
})
export class DualHorizontalImageDemo {
  images: MnDualHorizontalImageTypes[] = [
    { id: '1', url: 'https://media.istockphoto.com/id/1416797815/photo/golden-number-one.jpg?s=612x612&w=0&k=20&c=A1AOP7RZK8Rkk2yxEumTlWmhQE-0nGfxVz3Ef39Dzxc=', alt: 'Image 1' },
    { id: '2', url: 'https://i.pinimg.com/736x/64/f8/48/64f8483311d7e21dec9a80c69fb6f979.jpg', alt: 'Image 2' },
  ];
}
