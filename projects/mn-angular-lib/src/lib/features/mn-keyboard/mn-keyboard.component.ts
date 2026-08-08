import {Component, EventEmitter, HostBinding, Input, Output} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {MnBottomSheet} from '../mn-bottom-sheet';
import {MnKeyboardLabels, MnKeyboardLayout, MnKeyboardPresentation} from './mn-keyboard.types';

/** QWERTY letter rows, lower-case. Rendered upper-case when {@link MnKeyboard.uppercase} is set. */
const ALPHA_ROWS: readonly string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

/** The digit row that sits above the letters on an alphanumeric keyboard. */
const DIGIT_ROW: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/** Phone-style pad rows for the numeric layout. */
const NUMERIC_ROWS: readonly string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['0'],
];

/**
 * An on-screen keyboard for touch devices that have no keyboard of their own.
 *
 * It exists for unattended screens — a tablet on a wall, a kiosk by a door — where
 * the OS keyboard is either unavailable or unwanted, and where the same field may
 * need to take a membership number *or* a name. Hence one component with a
 * {@link layout} switch rather than a separate number pad and text pad.
 *
 * It is a controlled component: it never owns the text. The host passes {@link value}
 * and reacts to {@link valueChange}, exactly like a form control, so the same value
 * can also be filled by a barcode scanner or a real keyboard without this component
 * fighting it.
 *
 * With {@link presentation} set to `sheet` it mounts inside an {@link MnBottomSheet},
 * rising from the bottom of the screen and swipeable away — the shape a kiosk wants
 * so the keys do not permanently occupy half the display.
 *
 * The library ships no user-facing English, so every named key takes its caption
 * from {@link labels}.
 */
@Component({
  selector: 'mn-keyboard',
  standalone: true,
  imports: [MnBottomSheet, NgTemplateOutlet],
  templateUrl: './mn-keyboard.component.html',
  styleUrl: './mn-keyboard.component.css',
})
export class MnKeyboard {
  /** The current text. This component never mutates it — see {@link valueChange}. */
  @Input() value = '';
  /** Which keys to render. */
  @Input() layout: MnKeyboardLayout = 'alphanumeric';
  /** Whether the keys sit in the page or rise from the bottom as a sheet. */
  @Input() presentation: MnKeyboardPresentation = 'inline';
  /**
   * Captions and accessible names for the named keys.
   *
   * The defaults are language-neutral glyphs rather than words, so a consumer that
   * forgets to translate still ships no English (or Dutch) from the library. The
   * accessible name for the keyboard as a whole has no neutral glyph, so it
   * defaults to empty and the attribute is simply omitted until a host supplies one.
   */
  @Input() labels: MnKeyboardLabels = {
    backspace: '⌫',
    clear: '⨯',
    space: '␣',
    submit: '⏎',
    keyboard: '',
  };
  /** Whether letters are rendered (and typed) upper-case. */
  @Input() uppercase = false;
  /** Whether to offer a space key. Off for a field that can never contain one. */
  @Input() allowSpace = true;
  /** Whether to offer a submit key. */
  @Input() showSubmit = true;
  /** Whether the submit key is currently actionable. */
  @Input() submitDisabled = false;
  /** Hard cap on the text length, or null for none. */
  @Input() maxLength: number | null = null;
  /** Cap on the sheet height as a fraction of the viewport, in vh (sheet presentation only). */
  @Input() sheetMaxHeightVh = 60;

  /** Emits the full text after every key press, so the host can drive its own field. */
  @Output() valueChange = new EventEmitter<string>();
  /** Emits when the submit key is pressed. */
  @Output() submitted = new EventEmitter<string>();
  /** Emits when a sheet-presented keyboard is swiped or tapped away. */
  @Output() dismissed = new EventEmitter<void>();

  @HostBinding('class') get hostClasses(): string {
    return `mn-keyboard mn-keyboard-${this.layout}`;
  }

  /** The character rows to render, driven by {@link layout}. */
  get rows(): readonly string[][] {
    if (this.layout === 'numeric') {
      return NUMERIC_ROWS;
    }
    const letters = this.uppercase
      ? ALPHA_ROWS.map((row) => row.map((key) => key.toUpperCase()))
      : ALPHA_ROWS;
    return this.layout === 'alpha' ? letters : [[...DIGIT_ROW], ...letters];
  }

  /** Whether the space key should be offered (never on a digits-only pad). */
  get spaceVisible(): boolean {
    return this.allowSpace && this.layout !== 'numeric';
  }

  /**
   * Appends a character, respecting {@link maxLength}.
   * @param key The character pressed.
   */
  press(key: string): void {
    this.emit(this.value + key);
  }

  /** Appends a space. */
  pressSpace(): void {
    this.emit(this.value + ' ');
  }

  /** Removes the last character. */
  backspace(): void {
    this.emit(this.value.slice(0, -1));
  }

  /** Empties the field. */
  clear(): void {
    this.emit('');
  }

  /** Reports a submit press. The host decides what submitting means. */
  submit(): void {
    if (this.submitDisabled) {
      return;
    }
    this.submitted.emit(this.value);
  }

  /** Reports that a sheet-presented keyboard was dismissed. */
  onDismiss(): void {
    this.dismissed.emit();
  }

  /**
   * Emits a new value, clamped to {@link maxLength}.
   *
   * Clamping happens here rather than in each key handler so a paste-like burst
   * from a scanner and a tapped key are bounded the same way.
   * @param next The candidate text.
   */
  private emit(next: string): void {
    const clamped =
      this.maxLength !== null && next.length > this.maxLength
        ? next.slice(0, this.maxLength)
        : next;
    if (clamped === this.value) {
      return;
    }
    this.value = clamped;
    this.valueChange.emit(clamped);
  }
}
