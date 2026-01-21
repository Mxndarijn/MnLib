import {Component,  HostBinding,  Input } from '@angular/core';
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
  @Input() disabled: MnButtonTypes['disabled'] = false;

  // Bind the computed classes to the host element
  @HostBinding('class')
  get hostClasses(): string {
    return mnButtonVariants({
      size: this.size,
      variant: this.variant,
      color: this.color,
      borderRadius: this.borderRadius,
      disabled: this.disabled,
    });
  }
  // For accessibility (works for both <button> and <a>)
  @HostBinding('attr.aria-disabled')
  get ariaDisabled() {
    return this.disabled ? 'true' : null;
  }

  // Only meaningful for <button>. For <a> it does nothing semantically.
  @HostBinding('attr.disabled')
  get disabledAttr() {
    return this.disabled ? '' : null;
  }

  // Make disabled anchors unfocusable + prevent activation
  @HostBinding('attr.tabindex')
  get tabIndex() {
    return this.disabled ? '-1' : null;
  }

}
