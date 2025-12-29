import {Component, HostBinding, Input} from '@angular/core';
import {MnButtonTypeDirective} from './mn-button-type.directive';
import {MnButtonColorDirective} from './mn-button-color.directive';

@Component({
  selector: 'button[mnButton], a[mnButton]',
  standalone: true,
  templateUrl: './mn-button.html',
  hostDirectives: [
    { directive: MnButtonTypeDirective,  inputs: ['mnButtonType: type'] },
    { directive: MnButtonColorDirective, inputs: ['mnButtonColor: color'] },
  ]
})
export class MnButton{
  @HostBinding('class')
  readonly hostClass =
    'inline-flex items-center justify-center ' +
    'transition focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
    'focus:ring-red-500';

}

