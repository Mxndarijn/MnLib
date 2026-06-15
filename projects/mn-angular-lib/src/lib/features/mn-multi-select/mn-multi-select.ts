import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  InjectionToken,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';
import {NgClass} from '@angular/common';
import {MnMultiSelectProps, MnMultiSelectOption, MnMultiSelectErrorMessageData, MnMultiSelectUIConfig} from './mn-multi-selectTypes';
import {NgControl, ValidationErrors, Validators} from '@angular/forms';
import {mnMultiSelectVariants} from './mn-multi-selectVariants';
import {MnErrorMessage} from '../mn-error-message/mn-error-message';
import {MnButton} from '../mn-button';
import {MnConfigService} from "../../config";
import {MN_INSTANCE_ID, MN_SECTION_PATH} from "../../context";
import {MnLanguageService} from "../../language";
import {skip} from "rxjs";
import {LucideX} from "@lucide/angular";

export const MN_MULTI_SELECT_CONFIG = new InjectionToken<MnMultiSelectUIConfig>('MN_MULTI_SELECT_CONFIG');

@Component({
  selector: 'mn-lib-multi-select',
  standalone: true,
  imports: [NgClass, MnErrorMessage, MnButton, LucideX],
  templateUrl: './mn-multi-select.html',
})
export class MnMultiSelect implements OnInit {
  ngControl = inject(NgControl, {optional: true, self: true});

  protected uiConfig: MnMultiSelectUIConfig = {};

  @Input({ required: true }) props!: MnMultiSelectProps;

  private readonly configService = inject(MnConfigService);
  private readonly sectionPath = inject(MN_SECTION_PATH, { optional: true }) ?? [];
  private readonly explicitInstanceId = inject(MN_INSTANCE_ID, { optional: true });
  private readonly elRef = inject(ElementRef);
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Reference to the trigger element for positioning the dropdown */
  @ViewChild('trigger', { static: false }) triggerRef!: ElementRef<HTMLElement>;

  /** Currently selected values */
  selectedValues: unknown[] = [];
  isOpen = false;
  isDisabled = false;
  searchTerm = '';

  /** Dropdown position calculated from trigger bounding rect */
  dropdownStyle: { top: string; left: string; width: string } = { top: '0px', left: '0px', width: '0px' };

  private onChange: (val: unknown) => void = () => {
  };
  private onTouched: () => void = () => {};

  private readonly builtInErrorMessages: Record<string, MnMultiSelectErrorMessageData> = {
    required: 'At least one option must be selected',
  };

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngOnInit() {
    this.resolveConfig();

    const sub = this.lang.locale$.pipe(skip(1)).subscribe(() => {
      this.resolveConfig();
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private resolveConfig() {
    const instanceId = this.explicitInstanceId || `mn-multi-select-${this.props.id}`;
    this.uiConfig = this.configService.resolve<MnMultiSelectUIConfig>(
      'mn-multi-select',
      this.sectionPath,
      instanceId
    );

    if (this.props.label) {
      this.uiConfig = { ...this.uiConfig, label: this.props.label };
    }
    if (this.props.placeholder) {
      this.uiConfig = { ...this.uiConfig, placeholder: this.props.placeholder };
    }
  }

  // ========== ControlValueAccessor Implementation ==========

  writeValue(val: unknown): void {
    this.selectedValues = Array.isArray(val) ? val : [];
  }

  registerOnChange(fn: (val: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // ========== Dropdown Logic ==========

  toggle(): void {
    if (this.isDisabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.updateDropdownPosition();
    } else {
      this.searchTerm = '';
    }
  }

  /** Calculates the fixed position for the dropdown based on the trigger element */
  private updateDropdownPosition(): void {
    if (!this.triggerRef) return;
    const rect = this.triggerRef.nativeElement.getBoundingClientRect();
    this.dropdownStyle = {
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    };
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      if (this.isOpen) {
        this.isOpen = false;
        this.searchTerm = '';
      }
    }
  }

  /** Closes the dropdown when the page or a scrollable parent is scrolled */
  @HostListener('window:scroll', [])
  @HostListener('window:resize', [])
  onWindowScrollOrResize(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.searchTerm = '';
    }
  }

  toggleOption(option: MnMultiSelectOption): void {
    if (option.disabled) return;

    const index = this.selectedValues.indexOf(option.value);
    if (index > -1) {
      this.selectedValues = this.selectedValues.filter(v => v !== option.value);
    } else {
      if (this.props.maxSelections && this.selectedValues.length >= this.props.maxSelections) {
        return;
      }
      this.selectedValues = [...this.selectedValues, option.value];
    }
    this.onChange(this.selectedValues);
  }

  removeOption(option: MnMultiSelectOption, event: Event): void {
    event.stopPropagation();
    this.selectedValues = this.selectedValues.filter(v => v !== option.value);
    this.onChange(this.selectedValues);
  }

  isSelected(option: MnMultiSelectOption): boolean {
    return this.selectedValues.includes(option.value);
  }

  isMaxReached(option: MnMultiSelectOption): boolean {
    if (!this.props.maxSelections) return false;
    return this.selectedValues.length >= this.props.maxSelections && !this.isSelected(option);
  }

  onSearch(term: string): void {
    this.searchTerm = term;
  }

  get filteredOptions(): MnMultiSelectOption[] {
    if (!this.searchTerm) return this.props.options;
    const lower = this.searchTerm.toLowerCase();
    return this.props.options.filter(o => o.label.toLowerCase().includes(lower));
  }

  get selectedOptions(): MnMultiSelectOption[] {
    return this.props.options.filter(o => this.selectedValues.includes(o.value));
  }

  handleBlur(): void {
    this.onTouched();
  }

  // ========== Error Handling ==========

  get control() {
    return this.ngControl?.control ?? null;
  }

  get showError(): boolean {
    const c = this.control;
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  private pickErrorKey(errors: ValidationErrors): string {
    if (this.props.errorPriority) {
      for (const key of this.props.errorPriority) {
        if (errors[key] !== undefined) {
          return key;
        }
      }
    }
    return Object.keys(errors)[0];
  }

  protected isRequired(): boolean {
    if (!this.control) return false;
    return this.control.hasValidator(Validators.required);
  }

  private resolveErrorMessageForKey(errorKey: string, errors: ValidationErrors): string {
    const errorArgs = errors[errorKey];
    const customMsg = this.props.errorMessages?.[errorKey];
    const configMsg = this.uiConfig.errorMessages?.[errorKey];
    const useBuiltIn = this.props.useBuiltInErrorMessages !== false;
    const builtInMsg = useBuiltIn ? this.builtInErrorMessages[errorKey] : undefined;
    const fallbackMsg = this.props.defaultErrorMessage;
    const msgDef = customMsg ?? configMsg ?? builtInMsg ?? fallbackMsg ?? 'Invalid input';

    if (typeof msgDef === 'function') {
      return msgDef(errorArgs, errors);
    }
    // Interpolate {{placeholder}} tokens with validation error args
    if (typeof msgDef === 'string' && errorArgs && typeof errorArgs === 'object') {
      return msgDef.replace(/\{\{(\w+)\}\}/g, (_, key) => errorArgs[key] ?? _);
    }
    return msgDef;
  }

  get errorMessages(): string[] {
    const errors = this.control?.errors;
    if (!errors) return [];
    return Object.keys(errors).map(key => this.resolveErrorMessageForKey(key, errors));
  }

  get errorMessage(): string | null {
    const errors = this.control?.errors;
    if (!errors) return null;
    const errorKey = this.pickErrorKey(errors);
    return this.resolveErrorMessageForKey(errorKey, errors);
  }

  // ========== Resolved Properties ==========

  get resolvedId(): string {
    return this.props.id;
  }

  get resolvedName(): string | null {
    return this.props?.name ?? null;
  }

  get triggerClasses(): string {
    return mnMultiSelectVariants({
      size: this.props.size,
      borderRadius: this.props.borderRadius,
      shadow: this.props.shadow,
      fullWidth: this.props.fullWidth,
    });
  }
}
