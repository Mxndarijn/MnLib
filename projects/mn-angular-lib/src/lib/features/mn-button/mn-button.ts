import {Component, HostBinding, Input} from '@angular/core';

@Component({
  selector: 'button[mnButton], a[mnButton]',
  standalone: true,
  templateUrl: './mn-button.html',
})
export class MnButton{
  @HostBinding('class')
  readonly hostClass =
    'inline-flex items-center justify-center ' +
    'transition focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
    'focus:ring-red-500';

}

