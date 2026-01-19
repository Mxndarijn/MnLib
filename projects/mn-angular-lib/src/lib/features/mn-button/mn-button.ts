import {Component, HostBinding, Input} from '@angular/core';
import {MnButtonTypes} from './mn-buttonTypes';
import {mnButtonVariants} from './mn-buttonVariants';

@Component({
  selector: 'button[mnButton], a[mnButton]',
  standalone: true,
  templateUrl: './mn-button.html',
})
export class MnButton {
  @Input() size: MnButtonTypes['size'] = 'md';
  @Input() variant: MnButtonTypes['variant'] = 'fill';

  @HostBinding('class')
  get hostClasses(): string {
    return mnButtonVariants({ size: this.size, variant: this.variant });
  }

}
