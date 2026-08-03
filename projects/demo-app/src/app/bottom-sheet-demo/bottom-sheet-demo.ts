import {Component, signal, viewChild} from '@angular/core';
import {MnBottomSheet, MnButton, MnCheckbox, MnCheckboxProps} from 'mn-angular-lib';
import {DemoPageComponent} from '../shared/demo-page.component';
import {DemoExampleComponent} from '../shared/demo-example.component';

/**
 * Showcases the shared {@link MnBottomSheet} chrome: a viewport-anchored, swipe/flick
 * dismissible sheet that projects arbitrary body content. Each example toggles a signal
 * that mounts (or unmounts) a sheet, so dismissal simply tears it back out of the DOM.
 *
 * Swipe/flick-to-dismiss only arms at or below the `sm` breakpoint (≤640px); on a wide
 * viewport the sheet is closed via its backdrop, its in-sheet buttons, or a programmatic
 * `startClosing()`. Resize the window narrow (or use device emulation) to feel the drag.
 */
@Component({
  selector: 'app-bottom-sheet-demo',
  standalone: true,
  imports: [MnBottomSheet, MnButton, MnCheckbox, DemoPageComponent, DemoExampleComponent],
  templateUrl: './bottom-sheet-demo.html',
})
export class BottomSheetDemo {
  /** Whether each example's sheet is currently mounted. */
  readonly basicOpen = signal(false);
  readonly lockedOpen = signal(false);
  readonly guardedOpen = signal(false);
  readonly tallOpen = signal(false);

  /** Controls the guard example: when false, a user dismissal springs the sheet back. */
  readonly guardAllows = signal(true);

  /** Checkbox that flips {@link guardAllows} in the guard example. */
  readonly guardProps: MnCheckboxProps = {
    id: 'sheet-guard-allows',
    label: 'Allow dismissal',
    hover: true,
  };

  /** Last dismissal outcome surfaced under the guard example. */
  readonly guardLog = signal('—');

  private readonly basicSheet = viewChild<MnBottomSheet>('basicSheet');
  private readonly lockedSheet = viewChild<MnBottomSheet>('lockedSheet');

  /**
   * Async gate consulted before a user-initiated dismissal (swipe/flick/backdrop tap).
   * Bound as an arrow property so `this` stays this component when the sheet calls it.
   */
  readonly dismissGuard = (): boolean => {
    const allowed = this.guardAllows();
    this.guardLog.set(allowed ? 'Allowed — sheet dismissed.' : 'Blocked — sheet sprang back.');
    return allowed;
  };

  /** Plays the basic sheet's slide-down exit, then unmounts it. */
  async closeBasic(): Promise<void> {
    await this.basicSheet()?.startClosing();
    this.basicOpen.set(false);
  }

  /** Confirms the non-dismissible sheet: exit animation, then unmount. */
  async closeLocked(): Promise<void> {
    await this.lockedSheet()?.startClosing();
    this.lockedOpen.set(false);
  }
}
