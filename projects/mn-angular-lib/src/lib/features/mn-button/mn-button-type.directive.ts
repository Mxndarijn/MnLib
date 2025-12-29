import { Directive, HostBinding, Input } from '@angular/core';

type ButtonType = 'filled' | 'outline' | 'text';

@Directive({ selector: '[mnButtonType]', standalone: true })
export class MnButtonTypeDirective {
  @Input() mnButtonType: ButtonType = 'filled';

  @HostBinding('class') get classes(): string {
    const map: Record<ButtonType, string> = {
      filled:  'border border-transparent',
      outline: 'bg-transparent border',
      text:    'bg-transparent border-0',
    };
    return map[this.mnButtonType];
  }
}
