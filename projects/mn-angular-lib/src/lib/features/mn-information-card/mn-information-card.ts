import {Component, HostBinding, Input} from '@angular/core';
import {MnInformationCardTypes} from './mn-information-cardTypes';
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
  private _cardData: MnInformationCardTypes = {
    title: 'Example',
    description: 'This is an example card.'
  };

  @Input() set cardData(value: MnInformationCardTypes) {
    this._cardData = value;
  }

  get cardData(): MnInformationCardTypes {
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
