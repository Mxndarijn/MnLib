import {Component, signal} from '@angular/core';
import {MnButton, MnKeyboard, MnKeyboardLabels} from 'mn-angular-lib';
import {DemoPageComponent} from '../shared/demo-page.component';
import {DemoExampleComponent} from '../shared/demo-example.component';

/**
 * Showcases {@link MnKeyboard}: the on-screen keyboard for touch devices that have
 * no keyboard of their own — a wall tablet, a kiosk by a door.
 *
 * The examples lean on the two things a consumer has to understand. First, it is a
 * *controlled* component: every example keeps the text in its own signal and feeds
 * it back in, which is what lets a barcode scanner write the same field without the
 * keyboard fighting it. Second, the named keys take their captions from
 * {@link MnKeyboardLabels}, because the library ships no user-facing English.
 */
@Component({
  selector: 'app-keyboard-demo',
  standalone: true,
  imports: [MnKeyboard, MnButton, DemoPageComponent, DemoExampleComponent],
  templateUrl: './keyboard-demo.html',
})
export class KeyboardDemo {
  /** English captions, standing in for whatever the host app would translate. */
  readonly labels: MnKeyboardLabels = {
    backspace: 'Backspace',
    clear: 'Clear',
    space: 'Space',
    submit: 'Check in',
    keyboard: 'On-screen keyboard',
  };

  /** Text for the alphanumeric example — a field taking a number or a name. */
  readonly mixedValue = signal('');

  /** Text for the numeric example. */
  readonly numericValue = signal('');

  /** Text for the alpha example. */
  readonly alphaValue = signal('');

  /** Text for the sheet example. */
  readonly sheetValue = signal('');

  /** Whether the sheet-presented keyboard is mounted. */
  readonly sheetOpen = signal(false);

  /** Last value submitted from any example, so the output is visible. */
  readonly lastSubmitted = signal('—');

  /**
   * Records a submit press.
   * @param value The submitted text.
   */
  onSubmitted(value: string): void {
    this.lastSubmitted.set(value === '' ? '(empty)' : value);
  }

  /**
   * Records a submit from the sheet and closes it, the way a kiosk would.
   * @param value The submitted text.
   */
  onSheetSubmitted(value: string): void {
    this.onSubmitted(value);
    this.sheetOpen.set(false);
  }
}
