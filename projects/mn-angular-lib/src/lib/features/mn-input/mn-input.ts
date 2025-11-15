import {ChangeDetectionStrategy, Component, EventEmitter, forwardRef, Input, OnChanges, Output} from '@angular/core';
import {ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR} from '@angular/forms';
import {MnInputKind} from './mn-input.types';

let nextId = 0;

@Component({
  selector: 'mn-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mn-input.html',
  styleUrls: ['./mn-input.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MnInput),
      multi: true,
    },
  ]
})
export class MnInput implements ControlValueAccessor, OnChanges {
  // Visual/API inputs
  @Input() type: MnInputKind = 'text';
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() disabled = false;
  @Input() required = false;
  @Input() helpText?: string;
  @Input() error?: string | null;
  @Input() fullWidth = false;
  @Input() rows?: number; // textarea only
  @Input() autocomplete?: string;
  @Input() min?: string | number;
  @Input() max?: string | number;
  @Input() step?: string | number;
  @Input() name?: string;
  @Input() id?: string;

  // Two-way binding support aside from CVA
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();

  // Native-like passthrough events
  @Output() input = new EventEmitter<Event>();
  @Output() blur = new EventEmitter<FocusEvent>();
  @Output() focus = new EventEmitter<FocusEvent>();
  @Output() enter = new EventEmitter<KeyboardEvent>();

  cssClass = '';

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  get controlId(): string {
    if (!this.id) {
      this.id = `mn-input-${++nextId}`;
    }
    return this.id;
  }

  get isTextarea(): boolean {
    return this.type === 'textarea' || this.type === 'description';
  }

  get inputTypeAttr(): string | null {
    return this.isTextarea ? null : this.type;
  }

  get computedRows(): number {
    if (!this.isTextarea) return 1;
    if (typeof this.rows === 'number' && this.rows > 0) return this.rows;
    // Default larger height for description/textarea
    return 5;
  }

  ngOnChanges(): void {
    const classes = [
      'mn-field',
      this.fullWidth ? 'mn-field--full-width' : '',
      this.error ? 'mn-field--error' : '',
      this.disabled ? 'mn-field--disabled' : ''
    ].filter(Boolean);
    this.cssClass = classes.join(' ');
  }

  // ControlValueAccessor
  writeValue(obj: any): void {
    this.value = obj == null ? '' : String(obj);
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  // Template event handlers
  onNgModelChange(v: string): void {
    this.value = v ?? '';
    this.valueChange.emit(this.value);
    this.onChange(this.value);
  }

  onInput(e: Event): void {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const v = target.value;
    this.value = v;
    this.valueChange.emit(v);
    this.onChange(v);
    this.input.emit(e);
  }

  onBlur(e: FocusEvent): void {
    this.onTouched();
    this.blur.emit(e);
  }

  onFocus(e: FocusEvent): void {
    this.focus.emit(e);
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !this.isTextarea) {
      this.enter.emit(e);
    }
  }
}
