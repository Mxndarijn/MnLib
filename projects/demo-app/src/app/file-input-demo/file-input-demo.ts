import {Component, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MnFileInput, MnFileInputProps} from 'mn-angular-lib';

/**
 * Demo component showcasing MnFileInput features:
 * - The four display modes (dropzone, thumbnail, list, compact)
 * - Single vs multiple selection
 * - `accept`, `maxSize`, and `maxFiles` client-side limits
 * - Required validation through ReactiveForms
 * - Previewing and clearing an already-saved image via `currentUrl`
 */
@Component({
  selector: 'app-file-input-demo',
  standalone: true,
  imports: [MnFileInput, ReactiveFormsModule],
  templateUrl: './file-input-demo.html',
})
export class FileInputDemo {
  form = new FormGroup({
    avatar: new FormControl<File | null>(null, {validators: [Validators.required]}),
    gallery: new FormControl<File[]>([]),
    documents: new FormControl<File[]>([]),
    attachment: new FormControl<File | null>(null),
    cover: new FormControl<File | null>(null),
  });
  /** Example 1: Default dropzone, single image, required validator. */
  avatarProps = {
    id: 'avatar',
    label: 'Avatar',
    accept: 'image/*',
    maxSize: 2 * 1024 * 1024,
    errorMessages: {
      required: 'An avatar image is required',
    },
  } satisfies MnFileInputProps;
  /** Example 2: Thumbnail grid, multiple images, capped at 4. */
  galleryProps = {
    id: 'gallery',
    label: 'Gallery',
    accept: 'image/*',
    multiple: true,
    maxFiles: 4,
    maxSize: 5 * 1024 * 1024,
    displayMode: 'thumbnail',
  } satisfies MnFileInputProps;
  /** Example 3: List mode for non-image documents. */
  documentsProps = {
    id: 'documents',
    label: 'Documents',
    accept: '.pdf,.doc,.docx,.txt',
    multiple: true,
    displayMode: 'list',
  } satisfies MnFileInputProps;
  /** Example 4: Compact inline picker. */
  attachmentProps = {
    id: 'attachment',
    label: 'Attachment',
    displayMode: 'compact',
    accept: 'image/*',
  } satisfies MnFileInputProps;
  /** Example 5: Dropzone previewing an already-saved image. */
  coverProps = {
    id: 'cover',
    label: 'Cover image',
    accept: 'image/*',
    currentUrl: 'https://picsum.photos/seed/mnlib/640/360',
  } satisfies MnFileInputProps;
  /** Live snapshot of the form value, shown in the demo output panel. */
  protected readonly snapshot = signal<string>('');
  /** Tracks whether the saved cover image was removed by the user. */
  protected readonly coverCleared = signal(false);

  /** Refreshes the JSON snapshot of the current form value. */
  protected updateSnapshot(): void {
    const {avatar, gallery, documents, attachment, cover} = this.form.getRawValue();
    const describe = (file: File | null) => (file ? `${file.name} (${file.size} B)` : null);
    const describeMany = (files: File[] | null) => (files ?? []).map((f) => f.name);

    this.snapshot.set(
      JSON.stringify(
        {
          avatar: describe(avatar),
          gallery: describeMany(gallery),
          documents: describeMany(documents),
          attachment: describe(attachment),
          cover: describe(cover),
          coverCleared: this.coverCleared(),
        },
        null,
        2,
      ),
    );
  }

  /** Handles removal of the saved cover image. */
  protected onCoverCleared(): void {
    this.coverCleared.set(true);
    this.updateSnapshot();
  }

  /** Resets the form and demo state. */
  protected reset(): void {
    this.form.reset({avatar: null, gallery: [], documents: [], attachment: null, cover: null});
    this.coverCleared.set(false);
    this.snapshot.set('');
  }
}
