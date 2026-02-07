import {Component, HostBinding, Input} from '@angular/core';
import {MnInformationCardBaseData} from './mn-information-cardTypes';
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
export class MnInformationCard<TExtra = unknown> {
  @Input({ required: true }) data!: MnInformationCardData<TExtra>;

  get hostClasses(): string {
    return mnInformationCardVariants({
      bottomBorder: this.data.bottomBorder,
      shadow: this.data.shadow,
      textPosition: this.data.textPosition,
    });
  }
}

export type MnInformationCardData<TExtra = unknown> =
  MnInformationCardBaseData  & TExtra;
