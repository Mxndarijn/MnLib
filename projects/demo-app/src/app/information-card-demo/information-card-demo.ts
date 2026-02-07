import { Component } from '@angular/core';
import { MnInformationCard, MnInformationCardTypes } from 'mn-angular-lib';

@Component({
  selector: 'app-information-card-demo',
  standalone: true,
  imports: [MnInformationCard],
  templateUrl: './information-card-demo.html',
})
export class InformationCardDemo {
  cards: MnInformationCardTypes[] = [
    {
      title: 'Card 1',
      id: 1,
      description: 'This is card 1.',
      bottomBorder: true,
      shadow: true,
      image: {
        id: 1,
        url: 'https://logo-icons.com/cdn/shop/files/2081-logo-1713630973.369.svg?v=1713641356',
        alt: 'test-image',
      },
      textPosition: 'center',
    },
    { id: 2, title: 'Card 2', description: 'This is card 2.' },
  ];
}
