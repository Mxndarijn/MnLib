import {Component, Input} from '@angular/core';
import {MnButtonColor, MnButtonSize, MnButtonVariant} from "./mn-button.types";

@Component({
  selector: 'lib-button',
  imports: [],
  templateUrl: './mn-button.html',
  styleUrl: './mn-button.css',
})
export class MnButton {
  @Input() size?: MnButtonSize;
  @Input() color: MnButtonColor = 'primary';
  @Input() variant: MnButtonVariant = 'filled';
  @Input() disabled = false;
  @Input() fullWidth = false;

  get buttonClasses(): string {
    const classes = [
      `btn-${this.variant}`,
      `btn-${this.color}`
    ];
    if (this.size) {
      classes.push(`btn-${this.size}`);
    }
    if (this.fullWidth) {
      classes.push('btn-full-width');
    }
    return classes.join(' ');
  }
}
