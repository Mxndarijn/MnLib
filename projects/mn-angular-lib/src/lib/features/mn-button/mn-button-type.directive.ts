import { Directive, HostBinding, Input } from '@angular/core';

type ButtonType ='filled' | 'outline'  | 'text'

@Directive({
  selector: '[mnButtonType]',
  standalone: true,
})
export class MnButtonTypeDirective {
  @Input() mnButtonType: ButtonType ='filled'

  @HostBinding('class')
  get typeClass(): string {
    const typeClasses = {
      filled: 'border border-transparent',
      outline: 'bg-transparent border border-2',
      text: 'bg-transparent border-transparent',
    };
    return typeClasses[this.mnButtonType];
  }
}
