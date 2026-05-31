import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MnDatetime, MnDatetimeProps } from 'mn-angular-lib';

@Component({
  selector: 'app-datetime-demo',
  standalone: true,
  imports: [MnDatetime, ReactiveFormsModule],
  templateUrl: './datetime-demo.html',
})
export class DatetimeDemo {
  form = new FormGroup({
    appointment: new FormControl('', { validators: [Validators.required] }),
    birthday: new FormControl(''),
    meetingTime: new FormControl('', { validators: [Validators.required] }),
    deadline: new FormControl(''),
  });

  // Example 1: Default datetime-local mode with required validation
  appointmentProps = {
    id: 'appointment',
    label: 'Appointment',
    placeholder: 'Select date and time',
    mode: 'datetime-local',
  } satisfies MnDatetimeProps;

  // Example 2: Date-only mode
  birthdayProps = {
    id: 'birthday',
    label: 'Birthday',
    placeholder: 'Select your birthday',
    mode: 'date',
    size: 'lg',
    borderRadius: 'lg',
  } satisfies MnDatetimeProps;

  // Example 3: Time-only mode with required validation and custom error messages
  meetingTimeProps = {
    id: 'meeting-time',
    label: 'Meeting Time',
    placeholder: 'Select a time',
    mode: 'time',
    step: 900,
    errorMessages: {
      required: 'Please select a meeting time',
    },
  } satisfies MnDatetimeProps;

  // Example 4: Datetime-local with min/max constraints and full width
  deadlineProps = {
    id: 'deadline',
    label: 'Deadline',
    placeholder: 'Select deadline',
    mode: 'datetime-local',
    min: '2025-01-01T00:00',
    max: '2026-12-31T23:59',
    fullWidth: true,
    shadow: true,
    size: 'sm',
    borderRadius: 'sm',
  } satisfies MnDatetimeProps;
}
