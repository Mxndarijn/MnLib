import {
  Directive,
  Input,
  ViewContainerRef,
  OnInit,
  OnDestroy,
  ComponentRef,
  Type,
  forwardRef,
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
  @Input() component!: Type<unknown>;
  @Input() inputs?: ModalInputMap;

  private componentRef?: ComponentRef<unknown>;
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private vcr: ViewContainerRef) {}

  ngOnInit(): void {
    if (!this.component) return;

    this.vcr.clear();
    this.componentRef = this.vcr.createComponent(this.component);

    // Pass inputs to the component
    if (this.inputs) {
      Object.entries(this.inputs).forEach(([key, value]) => {
        (this.componentRef!.instance as any)[key] = value;
      });
    }

    // Wire up value accessor if the component supports it
    const instance = this.componentRef.instance as any;
    if (typeof instance.registerOnChange === 'function') {
      instance.registerOnChange((val: any) => this.onChange(val));
    }
    if (typeof instance.registerOnTouched === 'function') {
      instance.registerOnTouched(() => this.onTouched());
    }
  }

  ngOnDestroy(): void {
    this.componentRef?.destroy();
  }

  writeValue(val: any): void {
    const instance = this.componentRef?.instance as any;
    if (instance && typeof instance.writeValue === 'function') {
      instance.writeValue(val);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    const instance = this.componentRef?.instance as any;
    if (instance && typeof instance.setDisabledState === 'function') {
      instance.setDisabledState(isDisabled);
    }
  }
}
