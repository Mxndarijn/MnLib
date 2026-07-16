import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  InjectionToken,
  Input,
  OnInit,
  Renderer2,
  ViewChild
} from '@angular/core';
import {NgClass} from '@angular/common';
import {
  MnMultiSelectErrorMessageData,
  MnMultiSelectOption,
  MnMultiSelectProps,
  MnMultiSelectUIConfig
} from './mn-multi-selectTypes';
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
  private readonly renderer = inject(Renderer2);

  /** Reference to the trigger element for positioning the dropdown */
  @ViewChild('trigger', { static: false }) triggerRef!: ElementRef<HTMLElement>;
  /** The panel element currently moved into `document.body`, if any. */
  private movedPanel: HTMLElement | null = null;

  /**
   * The dropdown panel element, queried while it is rendered by the `@if` block.
   * The setter relocates the panel to `document.body` so that its `position: fixed`
   * coordinates resolve against the viewport rather than any transformed/filtered
   * ancestor (which would otherwise become the containing block and push the panel
   * to the middle of the screen — the root cause of the mis-positioning bug, also
   * broken on iOS). Cleanup is handled when the query clears on close/destroy.
   */
  @ViewChild('dropdown', {static: false})
  set dropdownRef(ref: ElementRef<HTMLElement> | undefined) {
    this.relocateDropdown(ref?.nativeElement ?? null);
  }

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
    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      // Guarantee the portalled panel never outlives the component.
      this.relocateDropdown(null);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as Node | null;
    // The panel lives at the body root once open, so it is not a descendant of the
    // host element — treat clicks inside the portalled panel as "inside" too.
    const insideHost = !!target && this.elRef.nativeElement.contains(target);
    const insidePanel = !!target && !!this.movedPanel && this.movedPanel.contains(target);
    if (!insideHost && !insidePanel) {
      if (this.isOpen) {
        this.isOpen = false;
        this.searchTerm = '';
      }
    }
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

  /** Closes the dropdown on Escape for keyboard accessibility. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.searchTerm = '';
    }
  }

  /**
   * Move the dropdown panel to `document.body` when it appears, and detach it when
   * the query clears. Appending to the body root makes the panel immune to ancestor
   * `transform`/`filter`/`will-change`, so `position: fixed` anchors to the viewport
   * and the panel stays under its trigger. Idempotent and safe to call with `null`.
   */
  private relocateDropdown(el: HTMLElement | null): void {
    if (el) {
      if (this.movedPanel === el) return;
      this.renderer.appendChild(document.body, el);
      this.movedPanel = el;
      return;
    }
    if (this.movedPanel) {
      // Angular's view teardown may already have removed it; only detach if still attached.
      const parent = this.movedPanel.parentNode;
      if (parent) {
        this.renderer.removeChild(parent, this.movedPanel);
      }
      this.movedPanel = null;
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

  // ========== Collapse Summary ==========

  /**
   * Whether the collapse-to-summary feature is opted into. Active when either
   * `collapsePlaceholder` or `collapseThreshold` is supplied; existing usages
   * with neither prop are unaffected.
   */
  get collapseEnabled(): boolean {
    return this.props.collapsePlaceholder !== undefined || this.props.collapseThreshold !== undefined;
  }

  /**
   * The threshold above which the trigger collapses. Defaults to 5 when collapsing
   * is enabled via `collapsePlaceholder` alone (no explicit `collapseThreshold`).
   */
  get effectiveCollapseThreshold(): number {
    return this.props.collapseThreshold ?? 5;
  }

  /**
   * Whether the trigger should currently render the count summary instead of the
   * individual chips: only when collapsing is enabled and the number of selected
   * options exceeds the effective threshold.
   */
  get isCollapsed(): boolean {
    return this.collapseEnabled && this.selectedOptions.length > this.effectiveCollapseThreshold;
  }

  /**
   * The summary text shown while collapsed, with the `{count}` token replaced by
   * the number of selected options. Falls back to `"{count} selected"` when no
   * `collapsePlaceholder` is provided.
   */
  get collapseSummaryText(): string {
    const template = this.props.collapsePlaceholder ?? '{count} selected';
    return template.replace(/\{count}/g, String(this.selectedOptions.length));
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
    if (errorArgs && typeof errorArgs === 'object') {
      return msgDef.replace(/\{\{(\w+)}}/g, (_, key) => errorArgs[key] ?? _);
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
