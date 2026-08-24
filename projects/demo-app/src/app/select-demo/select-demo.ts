import {Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MnButton, MnSectionDirective, MnSelect, MnSelectProps} from 'mn-angular-lib';
import {DemoPageComponent} from '../shared/demo-page.component';
import {DemoExampleComponent} from '../shared/demo-example.component';

@Component({
  selector: 'app-select-demo',
  standalone: true,
  imports: [MnSelect, ReactiveFormsModule, MnSectionDirective, MnButton, DemoPageComponent, DemoExampleComponent],
  templateUrl: './select-demo.html',
})
export class SelectDemo {
  form = new FormGroup({
    country: new FormControl('', {validators: [Validators.required]}),
    size: new FormControl(''),
    priority: new FormControl(''),
    timezone: new FormControl(''),
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

  // Example 4: Long list that auto-enables search (and opens as a sheet on mobile)
  timezoneProps: MnSelectProps = {
    id: 'timezone',
    label: 'Timezone',
    placeholder: 'Select a timezone...',
    searchPlaceholder: 'Search timezones...',
    options: [
      {label: 'UTC−08:00 — Los Angeles', value: 'la'},
      {label: 'UTC−05:00 — New York', value: 'ny'},
      {label: 'UTC−03:00 — São Paulo', value: 'sp'},
      {label: 'UTC±00:00 — London', value: 'lon'},
      {label: 'UTC+01:00 — Amsterdam', value: 'ams'},
      {label: 'UTC+02:00 — Athens', value: 'ath'},
      {label: 'UTC+03:00 — Istanbul', value: 'ist'},
      {label: 'UTC+05:30 — Mumbai', value: 'mum'},
      {label: 'UTC+08:00 — Singapore', value: 'sin'},
      {label: 'UTC+09:00 — Tokyo', value: 'tok'},
      {label: 'UTC+10:00 — Sydney', value: 'syd'},
      {label: 'UTC+12:00 — Auckland', value: 'akl'},
    ],
    fullWidth: true,
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

  get selectedTimezone(): string {
    return this.form.get('timezone')?.value || '(none)';
  }
}
