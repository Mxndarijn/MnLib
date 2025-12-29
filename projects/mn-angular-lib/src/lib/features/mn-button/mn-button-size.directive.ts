import { Directive, HostBinding, Input } from '@angular/core';
type ButtonSize ='s' | 'm' | 'l'

@Directive({
  selector: '[mnButtonSize]',
  standalone: true,
})
export class MnButtonSizeDirective {
  @Input() mnButtonSize: ButtonSize = "m";

  @HostBinding('class')
  get sizeClass(): string {
    const sizeClasses = {
      s: 'px-1 py-1 text-sm',
      m: 'px-4 py-2 text-base',
      l: 'px-6 py-3 text-lg',
    };
    return sizeClasses[this.mnButtonSize];
  }
}
