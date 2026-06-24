import {Component, computed, DestroyRef, EventEmitter, inject, Input, OnInit, Output, signal,} from '@angular/core';
import {CommonModule, NgClass} from '@angular/common';
import {NgControl, ValidationErrors, Validators} from '@angular/forms';
import {skip} from 'rxjs';
import {
  MnFileInputDisplayMode,
  MnFileInputErrorMessageData,
  MnFileInputProps,
  MnFileInputUIConfig,
} from './mn-file-inputTypes';
import {mnFileInputVariants} from './mn-file-inputVariants';
import {MnErrorMessage} from '../mn-error-message/mn-error-message';
import {LucideFile, LucideImagePlus, LucideTrash2, LucideUpload, LucideX} from '@lucide/angular';
import {MnConfigService} from '../../config';
import {MN_INSTANCE_ID, MN_SECTION_PATH} from '../../context';
import {MnLanguageService} from '../../language';
import {MnValidationErrorArgs} from '../../shared/types';

/** A single renderable entry in the file input (a newly-selected file or an existing image). */
export type MnFileDisplayItem = {
  /** File name (new files) or a derived name (existing images). */
  name: string;
  /** Whether the entry should render as an image preview. */
  isImage: boolean;
  /** Object-URL (new image files) or saved URL (existing images), else null. */
  previewUrl: string | null;
  /** Human-readable size for new files, else null. */
  sizeLabel: string | null;
  /** Index used by the remove action. */
  index: number;
  /** True for an already-saved image passed via `currentUrl(s)`. */
  existing: boolean;
};

/**
 * MnFileInput Component
 *
 * A generic, accessible file input that implements Angular's ControlValueAccessor.
 * It styles selection to match the rest of the input family, shows image previews
 * (and a file icon + name for non-images), supports single or multiple selection,
 * several display layouts, and client-side `accept` / `maxSize` / `maxFiles` limits.
 *
 * The form control value is the plain selection: `File | null` (single) or
 * `File[]` (multiple). An optional `currentUrl`/`currentUrls` renders an
 * already-saved image; removing it leaves the value untouched and emits `cleared`.
 *
 * @example
 * ```html
 * <mn-lib-file-input
 *   formControlName="image"
 *   [props]="{ id: 'image', label: 'Cover', accept: 'image/*', displayMode: 'dropzone' }"
 *   (cleared)="onRemoveExisting()">
 * </mn-lib-file-input>
 * ```
 */
@Component({
  selector: 'mn-lib-file-input',
  standalone: true,
  imports: [CommonModule, NgClass, MnErrorMessage, LucideFile, LucideImagePlus, LucideTrash2, LucideUpload, LucideX],
  templateUrl: './mn-file-input.html',
})
export class MnFileInput implements OnInit {
  ngControl = inject(NgControl, {optional: true, self: true});
  /** Configuration properties for the file input. */
  @Input({required: true}) props!: MnFileInputProps;
  /** Emits whenever the selected file(s) change (in addition to the form control). */
  @Output() filesChange = new EventEmitter<File | File[] | null>();
  /** Emits when the user removes an already-saved image (`currentUrl(s)`). */
  @Output() cleared = new EventEmitter<void>();
  /** Resolved UI configuration for the file input. */
  protected uiConfig: MnFileInputUIConfig = {};
  /** Currently selected files (always an array internally). */
  protected readonly files = signal<File[]>([]);
  /** Transient message for a rejected selection (accept/maxSize/maxFiles). */
  protected readonly internalError = signal<string | null>(null);
  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, {optional: true}) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, {optional: true});
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);
  /** Object-URL previews aligned to {@link files}; null for non-image entries. */
  private readonly previewUrls = signal<(string | null)[]>([]);
  /** True once the user removed the single existing image. */
  private readonly currentCleared = signal(false);
  /** Indices of removed existing images (multiple mode). */
  private readonly removedExisting = signal<Set<number>>(new Set());
  /** Renderable entries: existing images (when nothing newer hides them) then new files. */
  readonly displayItems = computed<MnFileDisplayItem[]>(() => {
    const items: MnFileDisplayItem[] = [];

    if (this.props.multiple) {
      const urls = this.props.currentUrls ?? [];
      const removed = this.removedExisting();
      urls.forEach((url, i) => {
        if (!removed.has(i)) items.push(this.existingItem(url, i));
      });
    } else if (this.files().length === 0 && this.props.currentUrl && !this.currentCleared()) {
      items.push(this.existingItem(this.props.currentUrl, 0));
    }

    const previews = this.previewUrls();
    this.files().forEach((file, i) => {
      items.push({
        name: file.name,
        isImage: this.isImage(file),
        previewUrl: previews[i] ?? null,
        sizeLabel: this.humanFileSize(file.size),
        index: i,
        existing: false,
      });
    });

    return items;
  });
  /** Disabled state pushed by the forms API. */
  private formDisabled = false;
  /**
   * Built-in default error messages in English.
   * Used when `useBuiltInErrorMessages` is true (default); overridable per-field.
   */
  private readonly builtInErrorMessages: Record<string, MnFileInputErrorMessageData> = {
    required: 'This field is required',
    accept: 'This file type is not allowed',
    maxSize: (args) => `File is too large (max ${args.max})`,
    maxFiles: (args) => `Too many files (max ${args.max})`,
  };

  /** Registers this component as the ControlValueAccessor for the injected control. */
  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  /** The effective display mode. */
  get displayMode(): MnFileInputDisplayMode {
    return this.props.displayMode ?? 'dropzone';
  }

  /** Whether the control is disabled (via props or the forms API). */
  get isDisabled(): boolean {
    return this.formDisabled || !!this.props.disabled;
  }

  /** Native `accept` attribute value, or null for no restriction when unset. */
  get acceptAttr(): string | null {
    return this.props.accept ?? null;
  }

  // ========== ControlValueAccessor Implementation ==========

  /** Resolved id for the file input element. */
  get resolvedId(): string {
    return this.props.id;
  }

  /** Resolved name attribute for the file input element. */
  get resolvedName(): string | null {
    return this.props.name ?? null;
  }

  /** Tailwind-variant classes for the clickable control. */
  get controlClasses(): string {
    return mnFileInputVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth ?? (this.displayMode !== 'compact'),
      dropzone: this.displayMode === 'dropzone',
      disabled: this.isDisabled,
    });
  }

  /** The attached form control, if any. */
  get control() {
    return this.ngControl?.control ?? null;
  }

  // ========== Selection handling ==========

  /** Whether to show control validation errors. */
  get showError(): boolean {
    const c = this.control;
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  /** All control error messages (used when `showAllErrors` is true). */
  get errorMessages(): string[] {
    const errors = this.control?.errors;
    if (!errors) return [];
    return Object.keys(errors).map((key) => this.resolveControlError(key, errors));
  }

  /** Single control error message (priority-aware). */
  get errorMessage(): string | null {
    const errors = this.control?.errors;
    if (!errors) return null;
    return this.resolveControlError(this.pickErrorKey(errors), errors);
  }

  ngOnInit(): void {
    this.resolveConfig();

    const sub = this.lang.locale$.pipe(skip(1)).subscribe(() => this.resolveConfig());
    this.destroyRef.onDestroy(() => sub.unsubscribe());
    this.destroyRef.onDestroy(() => this.revokeAll());
  }

  /**
   * Writes a value from the form into the control.
   * @param val A `File`, an array of `File`, or null/undefined.
   */
  writeValue(val: unknown): void {
    const next = Array.isArray(val) ? val.filter((f): f is File => f instanceof File)
      : val instanceof File ? [val]
        : [];
    this.setFiles(next);
  }

  /**
   * Registers the form's change callback.
   * @param fn Callback invoked with the new value.
   */
  registerOnChange(fn: (val: unknown) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the form's touched callback.
   * @param fn Callback invoked when the control is touched.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // ========== Derived view state ==========

  /**
   * Sets the disabled state of the control.
   * @param isDisabled Whether the control should be disabled.
   */
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled = isDisabled;
  }

  /**
   * Handles a file-picker change: validates the incoming files against the
   * configured limits and updates the selection.
   * @param event The native change event from the hidden file input.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const incoming = Array.from(input.files ?? []);
    input.value = '';
    if (incoming.length === 0) return;
    this.addFiles(incoming);
  }

  /**
   * Removes a newly-selected file by index.
   * @param index Index into the current selection.
   */
  removeFile(index: number): void {
    const next = this.files().filter((_, i) => i !== index);
    this.internalError.set(null);
    this.setFiles(next);
    this.emit();
  }

  /**
   * Removes an already-saved image and notifies the consumer via `cleared`.
   * @param index Index of the existing image (0 in single mode).
   */
  removeExisting(index: number): void {
    if (this.props.multiple) {
      const set = new Set(this.removedExisting());
      set.add(index);
      this.removedExisting.set(set);
    } else {
      this.currentCleared.set(true);
    }
    this.cleared.emit();
    this.onTouched();
  }

  /** Whether the attached control carries a `required` validator. */
  protected isRequired(): boolean {
    return this.control?.hasValidator(Validators.required) ?? false;
  }

  /** Stable track key for a display item across renders. */
  protected itemKey(item: MnFileDisplayItem): string {
    return `${item.existing ? 'e' : 'f'}-${item.index}`;
  }

  /** Whether a file should render as an image. */
  protected isImage(file: File): boolean {
    return (file.type ?? '').startsWith('image/');
  }

  /** Callback to notify Angular forms of value changes. */
  private onChange: (val: unknown) => void = () => {
  };

  // ========== Error handling (control validators) ==========

  /** Callback to notify Angular forms when the control is touched. */
  private onTouched: () => void = () => {
  };

  /** Resolves UI strings from config, layering built-in defaults and prop overrides. */
  private resolveConfig(): void {
    const instanceId = this.explicitInstanceId || `mn-file-input-${this.props.id}`;
    const resolved = this.configService.resolve<MnFileInputUIConfig>(
      'mn-file-input',
      this.sectionPath,
      instanceId,
    );

    const builtIn: MnFileInputUIConfig = {
      dropzoneHint: 'Click to upload or drag and drop',
      replaceLabel: 'Replace',
      removeLabel: 'Remove',
    };

    this.uiConfig = {...builtIn, ...resolved};
    if (this.props.label) this.uiConfig = {...this.uiConfig, label: this.props.label};
    if (this.props.dropzoneHint) this.uiConfig = {...this.uiConfig, dropzoneHint: this.props.dropzoneHint};
    if (this.props.replaceLabel) this.uiConfig = {...this.uiConfig, replaceLabel: this.props.replaceLabel};
    if (this.props.removeLabel) this.uiConfig = {...this.uiConfig, removeLabel: this.props.removeLabel};
  }

  /**
   * Validates and merges newly-picked files into the current selection.
   * @param incoming The files chosen by the user.
   */
  private addFiles(incoming: File[]): void {
    this.internalError.set(null);
    let errorKey: string | null = null;
    let errorArgs: MnValidationErrorArgs = {};

    let accepted = incoming.filter((f) => this.matchesAccept(f));
    if (accepted.length < incoming.length) errorKey = 'accept';

    if (this.props.maxSize != null) {
      const max = this.props.maxSize;
      const withinSize = accepted.filter((f) => f.size <= max);
      if (withinSize.length < accepted.length) {
        errorKey = 'maxSize';
        errorArgs = {max: this.humanFileSize(max)};
      }
      accepted = withinSize;
    }

    let next = this.props.multiple ? [...this.files(), ...accepted] : accepted.slice(-1);

    if (this.props.multiple && this.props.maxFiles != null && next.length > this.props.maxFiles) {
      next = next.slice(0, this.props.maxFiles);
      errorKey = 'maxFiles';
      errorArgs = {max: this.props.maxFiles};
    }

    if (errorKey) this.internalError.set(this.resolveMessage(errorKey, errorArgs));

    this.setFiles(next);
    this.emit();
  }

  /** Replaces the internal selection and rebuilds image previews. */
  private setFiles(next: File[]): void {
    this.revokeAll();
    this.files.set(next);
    this.previewUrls.set(next.map((f) => (this.isImage(f) ? URL.createObjectURL(f) : null)));
  }

  /** Emits the current value to the form and any listeners. */
  private emit(): void {
    const value = this.props.multiple ? this.files() : (this.files()[0] ?? null);
    this.onChange(value);
    this.onTouched();
    this.filesChange.emit(value);
  }

  /** Revokes any outstanding object-URL previews to avoid leaks. */
  private revokeAll(): void {
    for (const url of this.previewUrls()) {
      if (url) URL.revokeObjectURL(url);
    }
  }

  /** Builds a display item for an already-saved image. */
  private existingItem(url: string, index: number): MnFileDisplayItem {
    return {
      name: this.fileNameFromUrl(url),
      isImage: true,
      previewUrl: url,
      sizeLabel: null,
      index,
      existing: true,
    };
  }

  /** Picks which control error key to display. */
  private pickErrorKey(errors: ValidationErrors): string {
    if (this.props.errorPriority) {
      for (const key of this.props.errorPriority) {
        if (errors[key] !== undefined) return key;
      }
    }
    return Object.keys(errors)[0];
  }

  // ========== Helpers ==========

  /** Resolves a control error key to a message, interpolating its args. */
  private resolveControlError(key: string, errors: ValidationErrors): string {
    return this.resolveMessage(key, errors[key] as MnValidationErrorArgs);
  }

  /**
   * Resolves a message for an error key using the same precedence as the other
   * inputs: custom props > config > built-in > fallback > default.
   */
  private resolveMessage(key: string, args: MnValidationErrorArgs | undefined): string {
    const customMsg = this.props.errorMessages?.[key];
    const configMsg = this.uiConfig.errorMessages?.[key];
    const useBuiltIn = this.props.useBuiltInErrorMessages !== false;
    const builtInMsg = useBuiltIn ? this.builtInErrorMessages[key] : undefined;
    const fallbackMsg = this.props.defaultErrorMessage;

    const msgDef = customMsg ?? configMsg ?? builtInMsg ?? fallbackMsg ?? 'Invalid input';

    if (typeof msgDef === 'function') {
      return msgDef(args ?? {}, {});
    }
    if (args && typeof args === 'object') {
      return msgDef.replace(/\{\{(\w+)}}/g, (_match: string, token: string) => {
        const value = (args as Record<string, unknown>)[token];
        return value !== undefined ? String(value) : `{{${token}}}`;
      });
    }
    return msgDef;
  }

  /** Checks a file against the configured `accept` filter (extensions and MIME globs). */
  private matchesAccept(file: File): boolean {
    const accept = this.props.accept;
    if (!accept) return true;
    const tokens = accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tokens.length === 0) return true;
    const name = file.name.toLowerCase();
    const type = (file.type ?? '').toLowerCase();
    return tokens.some((token) => {
      if (token.startsWith('.')) return name.endsWith(token);
      if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
      return type === token;
    });
  }

  /** Formats a byte count as a human-readable size. */
  private humanFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /** Derives a display name from a URL (last path segment). */
  private fileNameFromUrl(url: string): string {
    const clean = url.split('?')[0].split('#')[0];
    const segment = clean.substring(clean.lastIndexOf('/') + 1);
    return segment || 'image';
  }
}
