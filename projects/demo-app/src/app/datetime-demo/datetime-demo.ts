import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MnDatetime, MnDatetimeProps, MnSectionDirective } from 'mn-angular-lib';

/**
 * Demo component showcasing MnDatetime features:
 * - Different modes: date, time, datetime-local
 * - Min/max constraints
 * - Step intervals
 * - Error handling and display modes
 */
@Component({
  selector: 'app-datetime-demo',
  standalone: true,
  imports: [MnDatetime, ReactiveFormsModule, MnSectionDirective],
  templateUrl: './datetime-demo.html',
})
export class DatetimeDemo {
  form = new FormGroup({
    dateOnly: new FormControl('', { validators: [Validators.required] }),
    timeOnly: new FormControl('', { validators: [Validators.required] }),
    dateTimeLocal: new FormControl('', { validators: [Validators.required] }),
    dateWithRange: new FormControl('', { validators: [Validators.required] }),
  });

  // Example 1: Date only mode
  dateOnlyProps = {
    id: 'date-only',
    label: 'Date Only',
    mode: 'date',
  } satisfies MnDatetimeProps;

  // Example 2: Time only mode
  timeOnlyProps = {
    id: 'time-only',
    label: 'Time Only',
    mode: 'time',
    step: 60,
  } satisfies MnDatetimeProps;

  // Example 3: Datetime-local (default mode)
  dateTimeLocalProps = {
    id: 'datetime-local',
    label: 'Date & Time',
  } satisfies MnDatetimeProps;

  // Example 4: Date with min/max range and custom error messages
  dateWithRangeProps = {
    id: 'date-with-range',
    label: 'Date with Range',
    mode: 'date',
    min: '2025-01-01',
    max: '2025-12-31',
    errorMessages: {
      required: 'Please select a date',
      mnMin: 'Date must be in 2025 or later',
      mnMax: 'Date must be in 2025 or earlier',
    },
  } satisfies MnDatetimeProps;
}
