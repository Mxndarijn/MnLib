import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MnInputField, MnInputProps } from 'mn-angular-lib';

/**
 * Custom validator: disallows the letter 'x' in the input value
 */
function noXAllowedValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value && control.value.toLowerCase().includes('x')) {
    return { noXAllowed: { actual: control.value } };
  }
  return null;
}

/**
 * Demo component showcasing MnInputField features:
 * - Built-in error messages (translated to English)
 * - Custom error messages
 * - Error priority
 * - Single vs multiple error display modes
 */
@Component({
  selector: 'app-input-field-demo',
  standalone: true,
  imports: [MnInputField, ReactiveFormsModule],
  templateUrl: './input-field-demo.html',
})
export class InputFieldDemo {
  form = new FormGroup({
    name: new FormControl('', { validators: [Validators.required] }),
    email: new FormControl('', { validators: [Validators.required, Validators.email] }),
    username: new FormControl('', { validators: [Validators.required, Validators.minLength(3), noXAllowedValidator] }),
    password: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(20),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      ]
    }),
  });

  // Example 1: Default behavior - built-in error messages, single error display
  // Note: size and borderRadius are optional (defaults to 'md')
  nameProps = {
    id: 'name',
    type: 'text',
    label: 'Name',
    placeholder: 'Enter your name',
  } satisfies MnInputProps;

  // Example 2: Custom error messages with built-ins disabled
  emailProps = {
    id: 'email',
    type: 'email',
    label: 'Email Address',
    shadow: true,
    placeholder: 'you@example.com',
    size: 'md',
    borderRadius: 'md',
    useBuiltInErrorMessages: false,
    errorMessages: {
      required: 'Please provide your email address',
      email: 'The email format is incorrect',
    },
    defaultErrorMessage: 'Invalid email field',
  } satisfies MnInputProps;

  // Example 3: Priority-based error display (shows one error at a time based on priority)
  usernameProps = {
    id: 'username',
    type: 'text',
    label: 'Username (Priority Mode)',
    placeholder: 'Choose a username',
    size: 'md',
    borderRadius: 'md',
    errorMessages: {
      noXAllowed: (args: any) => `Username cannot contain 'x' (you entered: ${args.actual})`,
      required: 'Username is required',
      minlength: 'Username must be at least 3 characters',
    },
    errorPriority: ['required', 'minlength', 'noXAllowed'],
    defaultErrorMessage: 'Username validation failed',
  } satisfies MnInputProps;

  // Example 4: Show ALL errors at once
  passwordProps = {
    id: 'password',
    type: 'password',
    label: 'Password (Show All Errors)',
    placeholder: 'Create a strong password',
    size: 'md',
    borderRadius: 'md',
    showAllErrors: true, // NEW: Display all validation errors simultaneously
    errorMessages: {
      required: 'Password is required',
      minlength: 'Password must be at least 8 characters',
      maxlength: 'Password must not exceed 20 characters',
      pattern: 'Password must contain uppercase, lowercase, and numbers',
    },
  } satisfies MnInputProps;
}
