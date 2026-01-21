import {Component,  HostBinding,  Input } from '@angular/core';
import { MnButtonTypes } from './mn-buttonTypes';
import { mnButtonVariants } from './mn-buttonVariants';

@Component({
  selector: 'button[mnButton], a[mnButton]',
  standalone: true,
  templateUrl: './mn-button.html',
})
export class MnButton {
  @Input() button: Partial<MnButtonTypes> = {};

  // Bind the computed classes to the host element
  @HostBinding('class')
  get hostClasses(): string {
    return mnButtonVariants({
      size: this.button.size,
      variant: this.button.variant,
      color: this.button.color,
      borderRadius: this.button.borderRadius,
      disabled: this.button.disabled,
    });
  }
  // For accessibility (works for both <button> and <a>)
  @HostBinding('attr.aria-disabled')
  get ariaDisabled() {
    return this.button.disabled ? 'true' : null;
  }

  // Only meaningful for <button>. For <a> it does nothing semantically.
  @HostBinding('attr.disabled')
  get disabledAttr() {
    return this.button.disabled ? '' : null;
  }

  // Make disabled anchors unfocusable + prevent activation
  @HostBinding('attr.tabindex')
  get tabIndex() {
    return this.button.disabled ? '-1' : null;
  }

}
