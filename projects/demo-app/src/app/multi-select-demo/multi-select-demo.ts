import {Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MnMultiSelect, MnMultiSelectProps, MnSectionDirective} from 'mn-angular-lib';

@Component({
  selector: 'app-multi-select-demo',
  standalone: true,
  imports: [MnMultiSelect, ReactiveFormsModule, MnSectionDirective],
  templateUrl: './multi-select-demo.html',
})
export class MultiSelectDemo {
  form = new FormGroup({
    fruits: new FormControl<string[]>([], {validators: [Validators.required]}),
    colors: new FormControl<string[]>([]),
    languages: new FormControl<string[]>([]),
  });

  // Example 1: Basic required multi-select
  fruitsProps: MnMultiSelectProps = {
    id: 'fruits',
    label: 'Favourite Fruits',
    placeholder: 'Select fruits...',
    options: [
      {label: 'Apple', value: 'apple'},
      {label: 'Banana', value: 'banana'},
      {label: 'Cherry', value: 'cherry'},
      {label: 'Mango', value: 'mango'},
      {label: 'Strawberry', value: 'strawberry'},
    ],
    fullWidth: true,
  };

  // Example 2: Searchable with max selections
  colorsProps: MnMultiSelectProps = {
    id: 'colors',
    label: 'Pick Colors (max 3)',
    placeholder: 'Search and select colors...',
    searchable: true,
    searchPlaceholder: 'Type to filter...',
    maxSelections: 3,
    options: [
      {label: 'Red', value: 'red'},
      {label: 'Blue', value: 'blue'},
      {label: 'Green', value: 'green'},
      {label: 'Yellow', value: 'yellow'},
      {label: 'Purple', value: 'purple'},
      {label: 'Orange', value: 'orange'},
      {label: 'Pink', value: 'pink'},
      {label: 'Teal', value: 'teal'},
    ],
    fullWidth: true,
  };

  // Example 3: Disabled options and custom error messages
  languagesProps: MnMultiSelectProps = {
    id: 'languages',
    label: 'Programming Languages',
    placeholder: 'Choose languages...',
    options: [
      {label: 'TypeScript', value: 'ts'},
      {label: 'JavaScript', value: 'js'},
      {label: 'Python', value: 'py'},
      {label: 'Rust', value: 'rust'},
      {label: 'Go', value: 'go'},
      {label: 'COBOL (deprecated)', value: 'cobol', disabled: true},
    ],
    fullWidth: true,
    errorMessages: {
      required: 'Please select at least one language',
    },
  };

  get selectedFruits(): string {
    const val = this.form.get('fruits')?.value;
    return val && val.length > 0 ? val.join(', ') : '(none)';
  }

  get selectedColors(): string {
    const val = this.form.get('colors')?.value;
    return val && val.length > 0 ? val.join(', ') : '(none)';
  }

  get selectedLanguages(): string {
    const val = this.form.get('languages')?.value;
    return val && val.length > 0 ? val.join(', ') : '(none)';
  }
}
