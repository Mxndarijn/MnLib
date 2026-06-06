import { Component, HostBinding, Input } from '@angular/core';
import { MnBadgeTypes } from './mn-badgeTypes';
import { mnBadgeVariants } from './mn-badgeVariants';

@Component({
  selector: 'span[mnBadge]',
  standalone: true,
  templateUrl: './mn-badge.html',
})
export class MnBadge {
  @Input() data: Partial<MnBadgeTypes> = {};

  @HostBinding('class')
  get hostClasses(): string {
    return mnBadgeVariants({
      size: this.data.size,
      color: this.data.color,
      wrap: this.data.wrap,
    });
  }
}
