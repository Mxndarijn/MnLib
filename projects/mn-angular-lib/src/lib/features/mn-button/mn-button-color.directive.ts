import { Directive, HostBinding, Input } from '@angular/core';
type ButtonColor ='red' | 'green'

@Directive({
  selector: '[mnButtonColor]',
  standalone: true,
})
export class MnButtonColorDirective {
  @Input() mnButtonColor: ButtonColor = "red";

  @HostBinding('class')
  get colorClass(): string {
    const colorClasses = {
      red: 'bg-red-500 text-orange-500',
      green: 'bg-green-500 text-blue-500',
    };
    return colorClasses[this.mnButtonColor];
  }
}
