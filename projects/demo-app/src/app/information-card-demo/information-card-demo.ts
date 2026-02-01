import { Component } from '@angular/core';
import {MnInformationCard, MnInformationCardTypes} from 'mn-angular-lib';

@Component({
  selector: 'app-information-card-demo',
  standalone: true,
  imports: [
    MnInformationCard
  ],
  templateUrl: './information-card-demo.html',
  styleUrl: './information-card-demo.css',
})
export class InformationCardDemo {
  cards: MnInformationCardTypes[] = [
    {
      title: 'Card 1',
      description: 'This is card 1.',
      bottomBorder: true,
      shadow: true,
      textPosition: 'center',
    },    { title: 'Card 2', description: 'This is card 2.' },
  ];
}
