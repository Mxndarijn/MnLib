import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  TemplateRef,
  Type,
  ViewChildren,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {Subscription} from 'rxjs';
import {MnModalRef} from '../../mn-modal-ref';
import {
  ActionStyle,
  CustomModalConfig,
  FormModalConfig,
  ModalCloseReason,
  ModalFooterAction,
  ModalKind,
  ModalRef,
  ModalSize,
  ModalStepId,
  NavigationDirection,
  WizardFlowMode,
  WizardModalConfig,
  WizardResult,
  WizardStepConfig,
} from '../../mn-modal.types';
import {MnButton, MnButtonTypes} from '../../../mn-button';
import {MnFormBodyComponent} from '../mn-form-body/mn-form-body.component';
import {MnCustomBodyHostComponent} from '../mn-custom-body-host/mn-custom-body-host.component';
import {MnFooterActionsComponent} from '../mn-footer-actions/mn-footer-actions.component';
import {MnLanguageService} from '../../../../language';
import {LucideDynamicIcon, LucideIconData} from '@lucide/angular';
import {MN_MODAL_ACTION_ICONS, MODAL_ACTION_ICON_SIZE} from '../../mn-modal-action-icons';

@Component({
  selector: 'mn-wizard-body',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MnButton, MnFormBodyComponent, MnCustomBodyHostComponent, MnFooterActionsComponent, LucideDynamicIcon],
  templateUrl: './mn-wizard-body.component.html',
  styleUrls: ['./mn-wizard-body.component.css'],
})
export class MnWizardBodyComponent implements OnInit, AfterViewInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  @Input() config!: WizardModalConfig;
  @Input() modalRef!: MnModalRef<WizardResult>;

  @ViewChildren(MnFormBodyComponent) formBodies!: QueryList<MnFormBodyComponent>;
  @ViewChildren('stepWrapper') stepWrappers!: QueryList<ElementRef<HTMLElement>>;

  currentStepId!: ModalStepId;
  /**
   * Title of the currently active step, mirrored into a signal so the modal
   * shell can append it to the modal title on small screens (where the step
   * labels under the progress circles are hidden). A signal — not a getter —
   * because the shell lives outside this component's change-detection subtree,
   * so a plain field mutation here would not update the shell in a zoneless app.
   */
  readonly currentStepTitle = signal<string | undefined>(undefined);
  visitedStepIds: ModalStepId[] = [];
  isCurrentStepValid = true;
  isCompleting = false;
  wizardErrors: Record<string, string> = {};

  /**
   * Min-height (px) for the step container, sized to the tallest step so the
   * modal does not jump when navigating between steps. Monotonic — only grows.
   */
  measuredMinHeight = 0;

  private languageService = inject(MnLanguageService);

  private static readonly DEFAULT_LABELS: Record<string, string> = {
    next: 'Next',
    back: 'Back',
    close: 'Close',
    complete: 'Complete',
    completing: 'Completing...',
  };

  private resolveLabel(i18nValue: string | undefined, key: string): string {
    if (i18nValue) return i18nValue;
    const translated = this.languageService.translate(`common.${key}`);
    return translated === `common.${key}` ? MnWizardBodyComponent.DEFAULT_LABELS[key] : translated;
  }

  /** Resolved i18n labels with defaults, falling back to translated keys */
  get labels() {
    const i18n = (this.config as { i18n?: Record<string, string> }).i18n || {};
    return {
      next: this.resolveLabel(i18n['next'], 'next'),
      back: this.resolveLabel(i18n['back'], 'back'),
      close: this.resolveLabel(i18n['close'], 'close'),
      complete: this.resolveLabel(i18n['complete'], 'complete'),
      completing: this.resolveLabel(i18n['completing'], 'completing'),
    };
  }

  /** Pre-built form configs keyed by step id — only for steps that have fields */
  stepFormConfigs: Record<ModalStepId, FormModalConfig<unknown, unknown>> = {};

  /**
   * Pre-built host configs keyed by step id — only for steps whose body is a
   * component or template (not a plain string) and that have no form fields.
   * Drives the `mn-custom-body-host` rendered for those steps.
   */
  stepBodyConfigs: Record<ModalStepId, CustomModalConfig> = {};

  private statusSubscription?: Subscription;
  private formBodiesSubscription?: Subscription;

  ngOnInit(): void {
    // Pre-build form configs for all form-driven steps
    for (const step of this.config.steps) {
      if (step.fields && step.fields.length > 0) {
        // Merge top-level initialValue with step-level initialValue
        const mergedInitialValue = {
          ...(this.config.initialValue || {}),
          ...(step.initialValue || {})
        };

        this.stepFormConfigs[step.id] = {
          kind: ModalKind.FORM,
          fields: step.fields,
          rows: step.rows,
          fieldGroups: step.fieldGroups,
          formValidators: step.formValidators,
          groupValidators: step.groupValidators,
          initialValue: mergedInitialValue,
          readOnly: this.config.readOnly,
          disabled: this.config.disabled
        } as FormModalConfig<unknown, unknown>;
      } else {
        // A component/template body (not a plain string) renders through the
        // custom-body host. Pre-build its config once so the `@Input` identity
        // stays stable across change detection and the body is not re-created.
        const bodyConfig = this.buildStepBodyConfig(step);
        if (bodyConfig) {
          this.stepBodyConfigs[step.id] = bodyConfig;
        }
      }
    }

    this.setCurrentStep(this.config.startStepId || this.config.steps[0]?.id);
    if (this.currentStepId) {
      this.visitedStepIds.push(this.currentStepId);
    }
  }

  ngAfterViewInit(): void {
    // Subscribe to form bodies list changes to track validity
    this.formBodiesSubscription = this.formBodies.changes.subscribe(() => {
      this.trackCurrentStepValidity();
      // Apply autofocus when form bodies change (e.g. step navigation)
      setTimeout(() => {
        this.getCurrentFormBody()?.applyAutoFocus();
      }, 100);
      // Re-measure in case dynamic field visibility changed a step's height
      this.measureTallestStep();
    });
    // Initial validity check
    this.trackCurrentStepValidity();

    // Pre-size the modal to the tallest step so it does not jump between steps.
    // All steps are already rendered (display:none), so this is a pure layout
    // read — it creates no components and triggers no data loads or autofocus.
    setTimeout(() => this.measureTallestStep(), 0);
    // A second pass catches content that grows after async data sources resolve.
    setTimeout(() => this.measureTallestStep(), 300);
  }

  isTextBody(step: WizardStepConfig): boolean {
    return typeof step.body === 'string';
  }

  /**
   * Builds the {@link CustomModalConfig} used to render a step whose body is a
   * component or template. Returns `undefined` for steps with no body or a
   * plain-string body (those render through their own template branches).
   * @param step The wizard step to inspect.
   */
  private buildStepBodyConfig(step: WizardStepConfig): CustomModalConfig | undefined {
    const body = step.body;
    if (!body || typeof body === 'string') return undefined;
    const config: CustomModalConfig = {kind: ModalKind.CUSTOM, inputs: step.bodyInputs};
    if (body instanceof TemplateRef) {
      config.template = body;
    } else {
      config.component = body as Type<unknown>;
    }
    return config;
  }

  async goToStep(step: WizardStepConfig): Promise<void> {
    if (!this.canNavigateToStep(step)) return;
    if (step.id === this.currentStepId) return;

    // Validate current step's form before allowing direct step navigation
    const formBody = this.getCurrentFormBody();
    if (formBody && formBody.form.invalid) {
      formBody.form.markAllAsTouched();
      return;
    }

    const previousStepId = this.currentStepId;
    this.setCurrentStep(step.id);

    if (!this.visitedStepIds.includes(this.currentStepId)) {
      this.visitedStepIds.push(this.currentStepId);
    }

    await this.notifyStepChange(previousStepId, NavigationDirection.DIRECT);
    this.trackCurrentStepValidity();
  }

  ngOnDestroy(): void {
    this.statusSubscription?.unsubscribe();
    this.formBodiesSubscription?.unsubscribe();
  }

  /**
   * Measures every step's natural height and records the tallest as
   * {@link measuredMinHeight}. Monotonic: the value only ever grows, so a
   * re-measure can never shrink the modal. Skipped when the modal has an
   * explicit height or is full-size (those are already fixed-height).
   */
  private measureTallestStep(): void {
    if (this.config.sizeHeight || this.config.sizeWidth === ModalSize.FULL) return;
    const wrappers = this.stepWrappers?.toArray().map(ref => ref.nativeElement) ?? [];
    if (wrappers.length === 0) return;

    // Synchronous pre-paint pass: show one step at a time, read its height,
    // then restore the original display values (so there is no visible flicker).
    const originalDisplay = wrappers.map(el => el.style.display);
    let tallest = 0;
    for (let i = 0; i < wrappers.length; i++) {
      for (let j = 0; j < wrappers.length; j++) {
        wrappers[j].style.display = i === j ? 'block' : 'none';
      }
      tallest = Math.max(tallest, wrappers[i].offsetHeight);
    }
    wrappers.forEach((el, i) => (el.style.display = originalDisplay[i]));

    if (tallest > this.measuredMinHeight) {
      this.measuredMinHeight = tallest;
      this.cdr.detectChanges();
    }
  }

  /** Get visible steps (filtered by visibility condition) */
  get visibleSteps(): WizardStepConfig[] {
    return this.config.steps.filter(s => this.isStepVisible(s));
  }

  isStepVisible(step: WizardStepConfig): boolean {
    if (!step.visible) return true;
    return step.visible(this.getAggregatedData());
  }

  get currentStep() {
    return this.config.steps.find(s => s.id === this.currentStepId);
  }

  get currentVisibleIndex(): number {
    return this.visibleSteps.findIndex(s => s.id === this.currentStepId);
  }

  get currentStepIndex(): number {
    return this.config.steps.findIndex(s => s.id === this.currentStepId);
  }

  get canGoBack(): boolean {
    return this.currentVisibleIndex > 0;
  }

  get canGoNext(): boolean {
    return this.currentVisibleIndex < this.visibleSteps.length - 1;
  }

  get isLastStep(): boolean {
    return this.currentVisibleIndex === this.visibleSteps.length - 1;
  }

  /** Icon size (px) for the wizard action buttons. */
  readonly actionIconSize = MODAL_ACTION_ICON_SIZE;

  /** Whether action-button icons should render on this wizard (defaults to true). */
  get showActionIcons(): boolean {
    return this.config.showActionIcons !== false;
  }

  /**
   * The leading icon for the back button, or null when icons are disabled.
   * Shows a back arrow when navigation is possible, otherwise a cross (the
   * button acts as "Close" on the first step).
   */
  get backIcon(): LucideIconData | null {
    if (!this.showActionIcons) return null;
    return this.canGoBack ? MN_MODAL_ACTION_ICONS.back : MN_MODAL_ACTION_ICONS.cancel;
  }

  /** The trailing icon for the next button, or null when icons are disabled. */
  get nextIcon(): LucideIconData | null {
    return this.showActionIcons ? MN_MODAL_ACTION_ICONS.next : null;
  }

  /** The leading icon for the complete button, or null when icons are disabled. */
  get completeIcon(): LucideIconData | null {
    return this.showActionIcons ? MN_MODAL_ACTION_ICONS.confirm : null;
  }

  /** Index of the current step for the progress line */
  get currentProgressIndex(): number {
    return this.currentVisibleIndex;
  }

  get isFreeFlow(): boolean {
    return this.config.flow === WizardFlowMode.FREE;
  }

  canNavigateToStep(step: WizardStepConfig): boolean {
    if (!this.isFreeFlow) return false;
    return this.isStepVisible(step);
  }

  async next(): Promise<void> {
    if (!this.canGoNext) return;

    const currentStep = this.currentStep;

    // Validate embedded form if present
    const formBody = this.getCurrentFormBody();
    if (formBody && formBody.form.invalid) {
      formBody.form.markAllAsTouched();
      return;
    }

    if (currentStep?.guard?.canExit) {
      const canExit = await currentStep.guard.canExit();
      if (!canExit) return;
    }

    if (currentStep?.validators) {
      for (const validator of currentStep.validators) {
        const result = await validator.validate();
        if (result.status === 'invalid') return;
      }
    }

    // Find next visible step
    const nextStep = this.visibleSteps[this.currentVisibleIndex + 1];
    if (!nextStep) return;

    if (nextStep.guard?.canEnter) {
      const canEnter = await nextStep.guard.canEnter();
      if (!canEnter) return;
    }

    const previousStepId = this.currentStepId;
    this.setCurrentStep(nextStep.id);

    if (!this.visitedStepIds.includes(this.currentStepId)) {
      this.visitedStepIds.push(this.currentStepId);
    }

    await this.notifyStepChange(previousStepId, NavigationDirection.FORWARD);
    this.trackCurrentStepValidity();
  }

  /** Find the MnFormBodyComponent for the current step */
  private getCurrentFormBody(): MnFormBodyComponent | undefined {
    if (!this.formBodies) return undefined;
    // formBodies only contains entries for steps that have stepFormConfigs
    // We need to find which form body index corresponds to the current step
    const formStepIds = this.config.steps
      .filter(s => this.stepFormConfigs[s.id])
      .map(s => s.id);
    const formIndex = formStepIds.indexOf(this.currentStepId);
    if (formIndex === -1) return undefined;
    return this.formBodies.toArray()[formIndex];
  }

  private trackCurrentStepValidity(): void {
    // Unsubscribe from previous
    this.statusSubscription?.unsubscribe();
    this.statusSubscription = undefined;

    const formBody = this.getCurrentFormBody();
    if (formBody && formBody.form) {
      this.isCurrentStepValid = formBody.form.valid;
      this.statusSubscription = formBody.form.statusChanges.subscribe(() => {
        this.isCurrentStepValid = formBody.form.valid;
        this.cdr.detectChanges();
      });
    } else {
      this.isCurrentStepValid = true;
    }
    this.cdr.detectChanges();
  }

  async back(): Promise<void> {
    if (!this.canGoBack) {
      // Call onCancel handler if configured
      if (this.config.onCancel) {
        await this.config.onCancel(ModalCloseReason.CANCELLED);
      }
      this.modalRef.dismiss(ModalCloseReason.CANCELLED);
      return;
    }

    const prevStep = this.visibleSteps[this.currentVisibleIndex - 1];
    const previousStepId = this.currentStepId;

    // Remove current step from visited so the circle resets
    this.visitedStepIds = this.visitedStepIds.filter(id => id !== this.currentStepId);

    this.setCurrentStep(prevStep.id);

    await this.notifyStepChange(previousStepId, NavigationDirection.BACKWARD);
    this.trackCurrentStepValidity();
  }

  /**
   * Activates a step and mirrors its title into {@link currentStepTitle} so the
   * shell can reflect the step name in the modal title on small screens.
   * @param stepId Id of the step to make current.
   */
  private setCurrentStep(stepId: ModalStepId): void {
    this.currentStepId = stepId;
    this.currentStepTitle.set(this.config.steps.find(s => s.id === stepId)?.title);
  }

  async complete(): Promise<void> {
    if (this.isCompleting) return;

    const currentStep = this.currentStep;

    // Validate embedded form if present
    const formBody = this.getCurrentFormBody();
    if (formBody && formBody.form.invalid) {
      formBody.form.markAllAsTouched();
      return;
    }

    if (currentStep?.validators) {
      for (const validator of currentStep.validators) {
        const result = await validator.validate();
        if (result.status === 'invalid') return;
      }
    }

    this.isCompleting = true;
    this.wizardErrors = {};
    this.cdr.detectChanges();

    try {
      const aggregatedData = this.getAggregatedData();

      // Run cross-step validators (onBeforeComplete)
      if (this.config.onBeforeComplete) {
        for (const validator of this.config.onBeforeComplete) {
          const errors = await validator(aggregatedData);
          if (errors) {
            this.wizardErrors = { ...this.wizardErrors, ...errors };
          }
        }
        if (Object.keys(this.wizardErrors).length > 0) {
          this.isCompleting = false;
          this.cdr.detectChanges();
          return;
        }
      }

      const result: WizardResult = {
        status: ModalCloseReason.COMPLETED,
        visitedStepIds: this.visitedStepIds,
        payload: aggregatedData,
      };

      if (this.config.onComplete) {
        await this.config.onComplete.handle(result);
      }

      this.modalRef.close(result);
    } catch (error) {
      this.isCompleting = false;
      this.cdr.detectChanges();
      console.error('Wizard completion error:', error);
    }
  }

  /** Collect form data from all form-driven steps, namespaced by step ID */
  private getAggregatedData(): Record<ModalStepId, Record<string, unknown>> {
    const aggregated: Record<ModalStepId, Record<string, unknown>> = {};
    if (!this.formBodies) return aggregated;

    const formStepIds = this.config.steps
      .filter(s => this.stepFormConfigs[s.id])
      .map(s => s.id);

    this.formBodies.toArray().forEach((fb, index) => {
      if (fb.form && formStepIds[index]) {
        aggregated[formStepIds[index]] = { ...fb.form.value };
      }
    });

    return aggregated;
  }

  /**
   * Maps a footer action's ActionStyle to mnButton data props.
   * @param action The footer action configuration.
   */
  getFooterActionButtonData(action: ModalFooterAction<unknown>): Partial<MnButtonTypes> {
    switch (action.style) {
      case ActionStyle.DANGER:
        return { variant: 'outline', color: 'danger' };
      case ActionStyle.PRIMARY:
        return { variant: 'fill', color: 'primary' };
      case ActionStyle.SECONDARY:
        return { variant: 'outline', color: 'secondary' };
      case ActionStyle.GHOST:
        return {variant: 'text', color: 'secondary'};
      default:
        return { variant: 'outline', color: 'secondary' };
    }
  }

  /**
   * Handles a custom footer action click.
   * @param action The footer action configuration.
   */
  async handleFooterAction(action: ModalFooterAction<unknown>): Promise<void> {
    if (action.handler) {
      await action.handler(this.modalRef as unknown as ModalRef<unknown>);
    }
    if (action.closesModal) {
      this.modalRef.close((action.closeReason || ModalCloseReason.PROGRAMMATIC) as unknown as WizardResult);
    }
  }

  private async notifyStepChange(previousStepId: ModalStepId, direction: NavigationDirection): Promise<void> {
    if (this.config.onStepChange) {
      await this.config.onStepChange.handle({
        previousStepId,
        currentStepId: this.currentStepId,
        direction,
      });
    }
  }
}
