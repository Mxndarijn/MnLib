import {Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MnSectionDirective, MnSelect, MnSelectProps} from 'mn-angular-lib';

@Component({
  selector: 'app-select-demo',
  standalone: true,
  imports: [MnSelect, ReactiveFormsModule, MnSectionDirective],
  templateUrl: './select-demo.html',
})
export class SelectDemo {
  form = new FormGroup({
    country: new FormControl('', {validators: [Validators.required]}),
    size: new FormControl(''),
    priority: new FormControl(''),
  });

  // Example 1: Basic required select with placeholder
  countryProps: MnSelectProps = {
    id: 'country',
    label: 'Country',
    placeholder: 'Select a country...',
    options: [
      {label: 'Netherlands', value: 'nl'},
      {label: 'Germany', value: 'de'},
      {label: 'France', value: 'fr'},
      {label: 'Belgium', value: 'be'},
      {label: 'United Kingdom', value: 'uk'},
    ],
    fullWidth: true,
  };

  // Example 2: Select with disabled options and custom styling
  sizeProps: MnSelectProps = {
    id: 'size',
    label: 'T-Shirt Size',
    placeholder: 'Pick a size...',
    options: [
      {label: 'XS', value: 'xs'},
      {label: 'S', value: 's'},
      {label: 'M', value: 'm'},
      {label: 'L', value: 'l'},
      {label: 'XL', value: 'xl'},
      {label: 'XXL (sold out)', value: 'xxl', disabled: true},
    ],
    size: 'lg',
    borderRadius: 'lg',
    fullWidth: true,
  };

  // Example 3: Select with custom error messages
  priorityProps: MnSelectProps = {
    id: 'priority',
    label: 'Priority',
    placeholder: 'Choose priority...',
    options: [
      {label: 'Low', value: 'low'},
      {label: 'Medium', value: 'medium'},
      {label: 'High', value: 'high'},
      {label: 'Critical', value: 'critical'},
    ],
    fullWidth: true,
    errorMessages: {
      required: 'Please select a priority level',
    },
  };

  get selectedCountry(): string {
    return this.form.get('country')?.value || '(none)';
  }

  get selectedSize(): string {
    return this.form.get('size')?.value || '(none)';
  }

  get selectedPriority(): string {
    return this.form.get('priority')?.value || '(none)';
  }
}
