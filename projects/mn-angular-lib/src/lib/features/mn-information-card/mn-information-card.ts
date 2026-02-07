import {Component, HostBinding, Input} from '@angular/core';
import {MnInformationCardData } from './mn-information-cardTypes';
import {mnInformationCardVariants} from './mn-information-cardVariants';
import {NgClass} from '@angular/common';

@Component({
  selector: 'lib-mn-information-card',
  standalone: true,
  imports: [
    NgClass
  ],
  templateUrl: './mn-information-card.html',
})
export class MnInformationCard {
  private _cardData!: MnInformationCardData

  @Input() set cardData(value: MnInformationCardData) {
    this._cardData = value;
  }

  get cardData(): MnInformationCardData {
    return this._cardData;
  }
  get hostClasses(): string {
    return mnInformationCardVariants({
      bottomBorder: this.cardData.bottomBorder,
      shadow: this.cardData.shadow,
      textPosition: this.cardData.textPosition,
    });
  }
}
