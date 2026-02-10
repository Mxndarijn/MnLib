import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MnTextarea, MnTextareaProps, MnSectionDirective } from 'mn-angular-lib';

/**
 * Demo component showcasing MnTextarea features:
 * - Basic textarea with rows/cols
 * - Resize variants
 * - Error handling (same patterns as MnInputField)
 * - Show all errors mode
 */
@Component({
  selector: 'app-textarea-demo',
  standalone: true,
  imports: [MnTextarea, ReactiveFormsModule, MnSectionDirective],
  templateUrl: './textarea-demo.html',
})
export class TextareaDemo {
  form = new FormGroup({
    description: new FormControl('', { validators: [Validators.required] }),
    bio: new FormControl('', { validators: [Validators.required, Validators.minLength(10), Validators.maxLength(200)] }),
    notes: new FormControl('', { validators: [Validators.required, Validators.minLength(5)] }),
  });

  // Example 1: Basic textarea with default settings
  descriptionProps = {
    id: 'description',
    label: 'Description',
    rows: 4,
    size: 'md',
    borderRadius: 'md',
    fullWidth: true,
    resize: 'vertical',
    errorMessages: {
      required: 'Description is required',
    },
  } satisfies MnTextareaProps;

  // Example 2: Textarea with custom size, no resize
  bioProps = {
    id: 'bio',
    label: 'Bio',
    rows: 6,
    cols: 50,
    size: 'lg',
    borderRadius: 'lg',
    shadow: true,
    resize: 'none',
    showAllErrors: true,
    errorMessages: {
      required: 'Bio is required',
      minlength: 'Bio must be at least 10 characters',
      maxlength: 'Bio must not exceed 200 characters',
    },
  } satisfies MnTextareaProps;

  // Example 3: Textarea with horizontal resize and priority errors
  notesProps = {
    id: 'notes',
    label: 'Notes',
    rows: 3,
    size: 'sm',
    borderRadius: 'sm',
    fullWidth: true,
    resize: 'both',
    errorPriority: ['required', 'minlength'],
    errorMessages: {
      required: 'Notes are required',
      minlength: 'Notes must be at least 5 characters',
    },
  } satisfies MnTextareaProps;
}
