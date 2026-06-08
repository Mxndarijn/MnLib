import { Component } from '@angular/core';
import { MnTabComponent, MnTabDataSource } from 'mn-angular-lib';

@Component({
  selector: 'app-tab-demo',
  standalone: true,
  imports: [MnTabComponent],
  templateUrl: './tab-demo.html',
})
export class TabDemo {
  tabDataSource: MnTabDataSource = {
    defaultActive: 0,
    items: [
      {
        label: 'Tab 1',
        onClick: () => console.log('Tab 1 clicked'),
      },
      {
        label: 'Tab 2',
        onClick: () => console.log('Tab 2 clicked'),
      },
      {
        label: 'Tab 3',
        onClick: () => console.log('Tab 3 clicked'),
      },
      {
        label: 'Tab 4',
        onClick: () => console.log('Tab 4 clicked'),
      },
      {
        label: 'Tab 5',
        onClick: () => console.log('Tab 5 clicked'),
      },
      {
        label: 'Tab 6',
        onClick: () => console.log('Tab 6 clicked'),
      },
      {
        label: 'Tab 7',
        onClick: () => console.log('Tab 7 clicked'),
      },
      {
        label: 'Tab 8',
        onClick: () => console.log('Tab 8 clicked'),
      },
    ],
  };

  shortTabDataSource: MnTabDataSource = {
    defaultActive: 0,
    items: [
      {
        label: 'Banen',
        onClick: () => console.log('Short Tab 1 clicked'),
      },
      {
        label: 'Kalender',
        onClick: () => console.log('Short Tab 2 clicked'),
      },
      {
        label: 'Categorieen',
        onClick: () => console.log('Short Tab 3 clicked'),
      },
    ],
  };

  onTabChange(item: any) {
    console.log('Active tab changed to:', item);
  }
}
