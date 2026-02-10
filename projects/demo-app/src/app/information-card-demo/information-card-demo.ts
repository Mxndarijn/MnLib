import {Component} from '@angular/core';
import {MnImageType, MnInformationCard, MnInformationCardData} from 'mn-angular-lib';

type OneImageExtra = { kind: 'one-image'; image: MnImageType };
type TwoImagesExtra = { kind: 'two-images'; images: [MnImageType, MnImageType] };

type OneImageCard = MnInformationCardData<OneImageExtra>;
type TwoImagesCard = MnInformationCardData<TwoImagesExtra>;

type Card = OneImageCard | TwoImagesCard;

@Component({
  selector: 'app-information-card-demo',
  standalone: true,
  imports: [MnInformationCard],
  templateUrl: './information-card-demo.html',
})
export class InformationCardDemo {
  cards: MnInformationCardData<Card>[] = [
    {
      title: 'Card 1',
      id: 1,
      description: 'This is card 1.',
      bottomBorder: true,
      borderRadius: 'none',
      shadow: true,
      kind: 'one-image',
      image: {
        id: 1,
        url: 'https://logo-icons.com/cdn/shop/files/2081-logo-1713630973.369.svg?v=1713641356',
        alt: 'test-image',
      },
      textPosition: 'center',
    },
    {
      id: 2,
      title: 'Card 2',
      description: 'This is card 2.',
      kind: 'two-images',
      borderRadius: 'none',
      images: [
        {
          id: 1,
          url: 'https://logo-icons.com/cdn/shop/files/2081-logo-1713630973.369.svg?v=1713641356',
          alt: 'test-image',
        },
        {
          id: 1,
          url: 'https://logo-icons.com/cdn/shop/files/2081-logo-1713630973.369.svg?v=1713641356',
          alt: 'test-image',
        }
      ]
    }
  ];
}
