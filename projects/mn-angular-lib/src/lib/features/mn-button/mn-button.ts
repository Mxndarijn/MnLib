import { Component, HostBinding, Input } from '@angular/core';
import { MnButtonTypes } from './mn-buttonTypes';
import { mnButtonVariants } from './mn-buttonVariants';

@Component({
  selector: 'button[mnButton], a[mnButton]',
  standalone: true,
  templateUrl: './mn-button.html',
})
export class MnButton {
  // Public API inputs with type-safety
  @Input() size: MnButtonTypes['size'] = 'md';
  @Input() variant: MnButtonTypes['variant'] = 'fill';
  @Input() color: MnButtonTypes['color'] = 'primary';
  @Input() borderRadius: MnButtonTypes['borderRadius'] = 'md';

  // Bind the computed classes to the host element
  @HostBinding('class')
  get hostClasses(): string {
    return mnButtonVariants({
      size: this.size,
      variant: this.variant,
      color: this.color,
      borderRadius: this.borderRadius,
    });
  }
}
