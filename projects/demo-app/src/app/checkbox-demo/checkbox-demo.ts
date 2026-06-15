import {Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MnCheckbox, MnCheckboxProps} from 'mn-angular-lib';

@Component({
  selector: 'app-checkbox-demo',
  standalone: true,
  imports: [MnCheckbox, ReactiveFormsModule],
  templateUrl: './checkbox-demo.html',
})
export class CheckboxDemo {
  // Standalone (no FormControl)
  optionA = false;
  optionB = true;

  // Reactive form
  form = new FormGroup({
    terms: new FormControl(false, {validators: [Validators.requiredTrue]}),
    newsletter: new FormControl(false),
    disabled: new FormControl({value: true, disabled: true}),
  });

  // Sizes
  sizeChecked = true;

  // Props
  optionAProps: MnCheckboxProps = {id: 'option-a', label: 'Option A', hover: true};
  optionBProps: MnCheckboxProps = {id: 'option-b', label: 'Option B (starts checked)', hover: true};

  termsProps: MnCheckboxProps = {
    id: 'terms',
    label: 'I accept the terms and conditions',
    errorMessages: {required: 'You must accept the terms to continue'},
  };
  newsletterProps: MnCheckboxProps = {id: 'newsletter', label: 'Subscribe to newsletter', hover: true};
  disabledProps: MnCheckboxProps = {id: 'disabled-cb', label: 'Disabled option (pre-checked)'};

  smProps: MnCheckboxProps = {id: 'size-sm', label: 'Small', size: 'sm'};
  mdProps: MnCheckboxProps = {id: 'size-md', label: 'Medium (default)', size: 'md'};
  lgProps: MnCheckboxProps = {id: 'size-lg', label: 'Large', size: 'lg'};
}
