import {Component,  HostBinding,  Input } from '@angular/core';
import { MnButtonTypes } from './mn-buttonTypes';
import { mnButtonVariants } from './mn-buttonVariants';

@Component({
  selector: 'button[mnButton], a[mnButton]',
  standalone: true,
  templateUrl: './mn-button.html',
})
export class MnButton {
  @Input() data: Partial<MnButtonTypes> = {};

  // Bind the computed classes to the host element
  @HostBinding('class')
  get hostClasses(): string {
    return mnButtonVariants({
      size: this.data.size,
      variant: this.data.variant,
      color: this.data.color,
      borderRadius: this.data.borderRadius,
      disabled: this.data.disabled,
    });
  }
  // For accessibility (works for both <button> and <a>)
  @HostBinding('attr.aria-disabled')
  get ariaDisabled() {
    return this.data.disabled ? 'true' : null;
  }

  // Only meaningful for <button>. For <a> it does nothing semantically.
  @HostBinding('attr.disabled')
  get disabledAttr() {
    return this.data.disabled ? '' : null;
  }

  // Make disabled anchors unfocusable + prevent activation
  @HostBinding('attr.tabindex')
  get tabIndex() {
    return this.data.disabled ? '-1' : null;
  }

}
