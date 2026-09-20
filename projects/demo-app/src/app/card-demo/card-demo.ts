import { Component } from '@angular/core';
import {
  LucideCalendarClock,
  LucideCheck,
  LucideListOrdered,
  LucideMapPin,
  LucideUsersRound,
  LucideWallet,
} from '@lucide/angular';
import {
  MnBadge,
  MnButton,
  MnCard,
  MnIconChip,
  MnProportionBar,
  MnProportionSegment,
  MnStatTile,
} from 'mn-angular-lib';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DemoExampleComponent } from '../shared/demo-example.component';

@Component({
  selector: 'app-card-demo',
  standalone: true,
  imports: [
    MnCard,
    MnIconChip,
    MnStatTile,
    MnProportionBar,
    MnBadge,
    MnButton,
    DemoPageComponent,
    DemoExampleComponent,
    LucideCalendarClock,
    LucideCheck,
    LucideListOrdered,
    LucideMapPin,
    LucideUsersRound,
    LucideWallet,
  ],
  templateUrl: './card-demo.html',
})
export class CardDemo {
  /** A turnout: answered yes, maybe, no, and not yet answered. */
  turnout: MnProportionSegment[] = [
    { value: 4, color: 'success' },
    { value: 1, color: 'warning' },
    { value: 1, color: 'danger' },
    { value: 2, color: 'gray' },
  ];

  /** A budget: spent against the whole. */
  budget: MnProportionSegment[] = [{ value: 3250, color: 'primary' }];
}
