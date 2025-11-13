import {ChangeDetectionStrategy, Component, Input, OnChanges} from '@angular/core';
import {MnButtonColor, MnButtonSize, MnButtonVariant, MnButtonType} from './mn-button.types';

@Component({
  selector: 'mn-button',
  standalone: true,
  templateUrl: './mn-button.html',
  styleUrls: ['./mn-button.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnButton implements OnChanges {
  @Input() size?: MnButtonSize;
  @Input() color: MnButtonColor = 'primary';
  @Input() variant: MnButtonVariant = 'filled';
  @Input() type: MnButtonType = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;

  cssClass = '';

  ngOnChanges(): void {
    const classes = [
      'mn-button',
      `mn-button--${this.variant}`,
      `mn-button--${this.color}`,
      this.size ? `mn-button--${this.size}` : '',
      this.fullWidth ? 'mn-button--full-width' : ''
    ].filter(Boolean);
    this.cssClass = classes.join(' ');
  }
}
