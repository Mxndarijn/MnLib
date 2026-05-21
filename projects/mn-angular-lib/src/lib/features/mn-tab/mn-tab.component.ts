import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MnTranslatePipe } from '../../language/mn-translate.pipe';
import { MnTabDataSource, MnTabItem } from './mn-tab.types';

/**
 * Tab component that renders a horizontal tab bar.
 * Supports translation keys for labels via MnTranslatePipe.
 */
@Component({
  selector: 'mn-tab',
  standalone: true,
  imports: [MnTranslatePipe],
  templateUrl: './mn-tab.component.html',
})
export class MnTabComponent implements OnInit {
  /** Data source containing tab items and default active index. */
  @Input() dataSource!: MnTabDataSource;

  /** Emits the newly activated tab item whenever the active tab changes. */
  @Output() activeChange = new EventEmitter<MnTabItem>();

  /** The currently active tab item. */
  currentActive?: MnTabItem;

  /** Initializes the default active tab based on the data source configuration. */
  ngOnInit(): void {
    if (
      this.dataSource &&
      this.dataSource.items.length > this.dataSource.defaultActive
    ) {
      this.currentActive = this.dataSource.items[this.dataSource.defaultActive];
    }
  }

  /**
   * Sets the given tab item as active, invoking deactivate/activate callbacks.
   * @param item - The tab item to activate.
   */
  setActive(item: MnTabItem): void {
    if (this.currentActive && this.currentActive !== item) {
      this.currentActive.onDeactivate?.();
      item.onClick?.();
      this.currentActive = item;
      this.activeChange.emit(item);
    }
  }
}
