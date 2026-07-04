import {Component, HostBinding, Input} from '@angular/core';
import {MnButtonTypes} from './mn-buttonTypes';
import {mnButtonVariants} from './mn-buttonVariants';

@Component({
  selector: 'button[mnButton], a[mnButton]',
  standalone: true,
  templateUrl: './mn-button.html',
})
export class MnButton {
  @Input() data: Partial<MnButtonTypes> = {};

  // A loading button is treated as non-interactive: it blocks clicks and is unfocusable,
  // Bind the computed classes to the host element
  @HostBinding('class')
  get hostClasses(): string {
    return mnButtonVariants({
      size: this.data.size,
      variant: this.data.variant,
      color: this.data.color,
      borderRadius: this.data.borderRadius,
      disabled: this.data.disabled,
      loading: this.data.loading,
      wrap: this.data.wrap,
      hover: this.data.hover,
    });
  }

  // Signals assistive tech that the control is busy while a loading action runs.
  @HostBinding('attr.aria-busy')
  get ariaBusy() {
    return this.data.loading ? 'true' : null;
  }
  // For accessibility (works for both <button> and <a>)
  @HostBinding('attr.aria-disabled')
  get ariaDisabled() {
    return this.data.disabled ? 'true' : null;
  }

  // Only meaningful for <button>. For <a> it does nothing semantically.
  @HostBinding('attr.disabled')
  get disabledAttr() {
    return this.isBlocked ? '' : null;
  }

  // Make disabled/loading anchors unfocusable + prevent activation
  @HostBinding('attr.tabindex')
  get tabIndex() {
    return this.isBlocked ? '-1' : null;
  }

  // so an in-flight action cannot be triggered a second time.
  private get isBlocked(): boolean {
    return !!(this.data.disabled || this.data.loading);
  }

}
