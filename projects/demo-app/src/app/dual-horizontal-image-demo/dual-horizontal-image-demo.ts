import { Component } from '@angular/core';
import { MnDualHorizontalImage, MnDualHorizontalImageTypes } from 'mn-angular-lib';

@Component({
  selector: 'app-dual-horizontal-image-demo',
  imports: [MnDualHorizontalImage],
  templateUrl: './dual-horizontal-image-demo.html',
})
export class DualHorizontalImageDemo {
  images: MnDualHorizontalImageTypes[] = [
    { id: '1', url: 'https://www.wildkogel-arena.at/site/assets/files/17949/wildkogelarena_2024-7237.1920x0-sp.jpg', alt: 'Image 1' },
    { id: '2', url: 'https://6hsport15.wordpress.com/wp-content/uploads/2016/01/skic3abn.jpg?w=617&h=411', alt: 'Image 2' },
  ];
}
