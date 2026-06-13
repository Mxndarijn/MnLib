import {
  Directive,
  Input,
  ViewContainerRef,
  OnInit,
  OnDestroy,
  ComponentRef,
  Type,
  forwardRef,
  inject
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { ModalInputMap } from '../../mn-modal.types';

@Directive({
  selector: '[mnCustomFieldHost]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MnCustomFieldHostDirective),
      multi: true,
    },
  ],
})
export class MnCustomFieldHostDirective implements OnInit, OnDestroy, ControlValueAccessor {
  private vcr = inject(ViewContainerRef);

  @Input() component!: Type<unknown>;
  @Input() inputs?: ModalInputMap;

  private componentRef?: ComponentRef<unknown>;
  private onChange: (val: unknown) => void = () => {
  };
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    if (!this.component) return;

    this.vcr.clear();
    this.componentRef = this.vcr.createComponent(this.component);

    // Pass inputs to the component
    if (this.inputs) {
      Object.entries(this.inputs).forEach(([key, value]) => {
        (this.componentRef!.instance as Record<string, unknown>)[key] = value;
      });
    }

    // Wire up value accessor if the component supports it
    const instance = this.componentRef.instance as {
      registerOnChange?: (fn: (val: unknown) => void) => void;
      registerOnTouched?: (fn: () => void) => void;
    };
    if (typeof instance.registerOnChange === 'function') {
      instance.registerOnChange((val: unknown) => this.onChange(val));
    }
    if (typeof instance.registerOnTouched === 'function') {
      instance.registerOnTouched(() => this.onTouched());
    }
  }

  ngOnDestroy(): void {
    this.componentRef?.destroy();
  }

  writeValue(val: unknown): void {
    const instance = this.componentRef?.instance as { writeValue?: (val: unknown) => void };
    if (instance && typeof instance.writeValue === 'function') {
      instance.writeValue(val);
    }
  }

  registerOnChange(fn: (val: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    const instance = this.componentRef?.instance as { setDisabledState?: (isDisabled: boolean) => void };
    if (instance && typeof instance.setDisabledState === 'function') {
      instance.setDisabledState(isDisabled);
    }
  }
}
