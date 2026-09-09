import { Component, signal } from '@angular/core';
import { LucideCalendarDays, LucideLayoutGrid, LucideList, LucideMap } from '@lucide/angular';
import { MnSegmented, MnSegmentedDataSource } from 'mn-angular-lib';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DemoExampleComponent } from '../shared/demo-example.component';

@Component({
  selector: 'app-segmented-demo',
  standalone: true,
  imports: [MnSegmented, DemoPageComponent, DemoExampleComponent],
  templateUrl: './segmented-demo.html',
})
export class SegmentedDemo {
  /** The classic view switch: a list of things, or the same things on a calendar. */
  viewSwitch: MnSegmentedDataSource = {
    ariaLabel: 'View',
    items: [
      { value: 'list', label: 'List', icon: LucideList.icon },
      { value: 'calendar', label: 'Calendar', icon: LucideCalendarDays.icon },
    ],
  };

  /** Three choices, no icons, at the smaller scale. */
  scopeSwitch: MnSegmentedDataSource = {
    ariaLabel: 'Scope',
    size: 'sm',
    items: [
      { value: 'mine', label: 'Mine' },
      { value: 'team', label: 'Team' },
      { value: 'all', label: 'Everyone' },
    ],
  };

  /** Icon-only segments, each named for a screen reader, with one unavailable. */
  layoutSwitch: MnSegmentedDataSource = {
    ariaLabel: 'Layout',
    items: [
      { value: 'list', icon: LucideList.icon, ariaLabel: 'List layout' },
      { value: 'grid', icon: LucideLayoutGrid.icon, ariaLabel: 'Grid layout' },
      { value: 'map', icon: LucideMap.icon, ariaLabel: 'Map layout', disabled: true },
    ],
  };

  /** The same switch as a pill, and as a square-cornered control. */
  pillSwitch: MnSegmentedDataSource = {
    ariaLabel: 'View',
    borderRadius: 'full',
    items: [
      { value: 'list', label: 'List', icon: LucideList.icon },
      { value: 'calendar', label: 'Calendar', icon: LucideCalendarDays.icon },
    ],
  };

  /** Square corners, at the small scale. */
  squareSwitch: MnSegmentedDataSource = {
    ariaLabel: 'View',
    borderRadius: 'none',
    size: 'sm',
    items: [
      { value: 'list', label: 'List', icon: LucideList.icon },
      { value: 'calendar', label: 'Calendar', icon: LucideCalendarDays.icon },
    ],
  };

  /** Active view, owned here — the control renders what this says. */
  view = signal('list');

  /** Active scope. */
  scope = signal('mine');

  /** Active layout. */
  layout = signal('list');
}
