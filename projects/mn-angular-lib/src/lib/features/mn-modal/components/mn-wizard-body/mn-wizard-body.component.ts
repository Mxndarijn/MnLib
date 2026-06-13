import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChildren,
  QueryList,
  AfterViewInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MnModalRef } from '../../mn-modal-ref';
import {
  WizardModalConfig,
  WizardStepConfig,
  ModalStepId,
  NavigationDirection,
  ModalCloseReason,
  WizardResult,
  WizardFlowMode,
  ModalKind,
  FormModalConfig,
  ModalFooterAction,
  ActionStyle,
  ModalRef,
} from '../../mn-modal.types';
import { MnButton } from '../../../mn-button';
import {MnButtonTypes} from '../../../mn-button/mn-buttonTypes';
import { MnFormBodyComponent } from '../mn-form-body/mn-form-body.component';
import { MnCustomBodyHostComponent } from '../mn-custom-body-host/mn-custom-body-host.component';
import { MnFooterActionsComponent } from '../mn-footer-actions/mn-footer-actions.component';
import { MnLanguageService } from '../../../../language';

@Component({
  selector: 'mn-wizard-body',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MnButton, MnFormBodyComponent, MnCustomBodyHostComponent, MnFooterActionsComponent],
  templateUrl: './mn-wizard-body.component.html',
  styleUrls: ['./mn-wizard-body.component.css'],
})
export class MnWizardBodyComponent implements OnInit, AfterViewInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  @Input() config!: WizardModalConfig;
  @Input() modalRef!: MnModalRef<WizardResult>;

  @ViewChildren(MnFormBodyComponent) formBodies!: QueryList<MnFormBodyComponent>;

  currentStepId!: ModalStepId;
  visitedStepIds: ModalStepId[] = [];
  isCurrentStepValid = true;
  isCompleting = false;
  wizardErrors: Record<string, string> = {};

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
      }
    }

    this.currentStepId = this.config.startStepId || this.config.steps[0]?.id;
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
    });
    // Initial validity check
    this.trackCurrentStepValidity();
  }

  ngOnDestroy(): void {
    this.statusSubscription?.unsubscribe();
    this.formBodiesSubscription?.unsubscribe();
  }

  isTextBody(step: WizardStepConfig): boolean {
    return typeof step.body === 'string' || typeof step.body === 'number';
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
    this.currentStepId = step.id;

    if (!this.visitedStepIds.includes(this.currentStepId)) {
      this.visitedStepIds.push(this.currentStepId);
    }

    await this.notifyStepChange(previousStepId, NavigationDirection.DIRECT);
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
    this.currentStepId = nextStep.id;

    if (!this.visitedStepIds.includes(this.currentStepId)) {
      this.visitedStepIds.push(this.currentStepId);
    }

    await this.notifyStepChange(previousStepId, NavigationDirection.FORWARD);
    this.trackCurrentStepValidity();
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

    this.currentStepId = prevStep.id;

    await this.notifyStepChange(previousStepId, NavigationDirection.BACKWARD);
    this.trackCurrentStepValidity();
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
