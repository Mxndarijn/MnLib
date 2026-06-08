import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MnTranslatePipe } from '../../language';
import { MnTabDataSource, MnTabItem } from './mn-tab.types';
import { CommonModule } from '@angular/common';

/**
 * Tab component that renders a horizontal tab bar.
 * Supports translation keys for labels via MnTranslatePipe.
 */
@Component({
  selector: 'mn-tab',
  standalone: true,
  imports: [MnTranslatePipe, CommonModule],
  templateUrl: './mn-tab.component.html',
})
export class MnTabComponent implements OnInit {
  /** Data source containing tab items and default active index. */
  @Input() dataSource!: MnTabDataSource;

  /**
   * Whether to enable horizontal scrolling when items overflow.
   * If true, tabs will scroll horizontally instead of shrinking too much.
   */
  @Input() scrollable: boolean = false;

  /**
   * Whether tabs should stretch to fill the available width.
   * Defaults to false, so tabs only take as much space as their content.
   */
  @Input() justified: boolean = false;

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
