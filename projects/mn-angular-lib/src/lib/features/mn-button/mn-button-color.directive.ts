import { Directive, HostBinding, Input, Optional, Self } from '@angular/core';
import { MnButtonTypeDirective } from './mn-button-type.directive';

type ButtonColor = 'red' | 'green';

const COLORMAP = {
  filled: {
    red:   'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    green: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500',
  },
  outline: {
    red:   'text-red-600 border-red-500 hover:bg-red-50 focus:ring-red-500',
    green: 'text-green-600 border-green-500 hover:bg-green-50 focus:ring-green-500',
  },
  text: {
    red:   'text-red-600 hover:bg-red-50 focus:ring-red-500',
    green: 'text-green-600 hover:bg-green-50 focus:ring-green-500',}

}

@Directive({ selector: '[mnButtonColor]', standalone: true })
export class MnButtonColorDirective {
  @Input() mnButtonColor: ButtonColor = 'red';

  constructor(@Self() @Optional() private type?: MnButtonTypeDirective) {}
  // TODO think of a new solution for this
  @HostBinding('class') get classes(): string {
    const t = this.type?.mnButtonType ?? 'filled';
    switch (t) {
      case 'outline': return COLORMAP.outline[this.mnButtonColor];
      case 'text':    return COLORMAP.text[this.mnButtonColor];
      case 'filled':
      default:        return COLORMAP.filled[this.mnButtonColor];
    }
  }
}
