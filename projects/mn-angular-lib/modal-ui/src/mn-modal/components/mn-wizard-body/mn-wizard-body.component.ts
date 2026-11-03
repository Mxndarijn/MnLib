import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  TemplateRef,
  Type,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { merge, Subscription } from 'rxjs';
import { MnModalRef } from 'mn-angular-lib/modal-core';
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
} from 'mn-angular-lib/modal-core';
import { MnButton, MnButtonTypes } from 'mn-angular-lib/button';
import { MnFormBodyComponent } from '../mn-form-body/mn-form-body.component';
import { MnCustomBodyHostComponent } from '../mn-custom-body-host/mn-custom-body-host.component';
import { MnFooterActionsComponent } from '../mn-footer-actions/mn-footer-actions.component';
import { MnLanguageService } from 'mn-angular-lib/core';
import { LucideDynamicIcon, LucideIconData } from '@lucide/angular';
import { MN_MODAL_ACTION_ICONS, MODAL_ACTION_ICON_SIZE } from 'mn-angular-lib/modal-core';

@Component({
  selector: 'mn-wizard-body',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MnButton,
    MnFormBodyComponent,
    MnCustomBodyHostComponent,
    MnFooterActionsComponent,
    LucideDynamicIcon,
  ],
  templateUrl: './mn-wizard-body.component.html',
  styleUrls: ['./mn-wizard-body.component.css'],
})
export class MnWizardBodyComponent implements OnInit, AfterViewInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  @Input() config!: WizardModalConfig;
  @Input() modalRef!: MnModalRef<WizardResult>;

  @ViewChildren(MnFormBodyComponent) formBodies!: QueryList<MnFormBodyComponent>;
  @ViewChildren('stepWrapper') stepWrappers!: QueryList<ElementRef<HTMLElement>>;
  /**
   * The step body's scroll container. Every step renders into this one element
   * (inactive steps are hidden, not destroyed), so its scroll offset is shared —
   * without an explicit reset, arriving on a new step lands you wherever the
   * previous step was scrolled to. See {@link setCurrentStep}.
   */
  @ViewChild('stepScroller') stepScroller?: ElementRef<HTMLElement>;

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
   * Browser-history entries this wizard has below and including the current one,
   * so Back steps the wizard instead of leaving the host page (em8TA5ZU).
   * Always the current entry's position + 1; cleaned up on destroy / dismiss.
   */
  private historyDepth = 0;
  /** Set while our own history.back() is in flight, so its popstate is consumed. */
  private ignorePopstate = false;
  /** Settles a pending {@link unwindWizardHistory} once its popstate arrives. */
  private resolveUnwind?: () => void;
  /** How long Complete waits for the unwind's popstate before running anyway. */
  private static readonly UNWIND_FALLBACK_MS = 300;
  /** history.state key holding the step id of a wizard entry. */
  private static readonly HISTORY_STATE_KEY = 'mnWizard';
  /**
   * history.state key holding a wizard entry's position (0 = first). It tells
   * Back from Forward: popstate has no direction, and in a free-flow wizard the
   * trail of visited steps is not the visible step order.
   */
  private static readonly HISTORY_POS_KEY = 'mnWizardPos';
  /**
   * history.state key holding the id of the wizard that pushed the entry. An
   * entry another wizard left behind (one that closed without unwinding) is
   * then never mistaken for one of ours.
   */
  private static readonly HISTORY_ID_KEY = 'mnWizardId';
  /** Source of {@link historyId}; one per wizard opened in this page. */
  private static nextHistoryId = 1;
  /** This wizard's id in its history entries. */
  private readonly historyId = MnWizardBodyComponent.nextHistoryId++;

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
          ...(step.initialValue || {}),
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
          disabled: this.config.disabled,
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
    this.pushWizardHistory();
  }

  /** Builds the history.state for a wizard entry at `pos` showing the current step. */
  private wizardHistoryState(pos: number): Record<string, unknown> {
    return {
      [MnWizardBodyComponent.HISTORY_STATE_KEY]: this.currentStepId,
      [MnWizardBodyComponent.HISTORY_POS_KEY]: pos,
      [MnWizardBodyComponent.HISTORY_ID_KEY]: this.historyId,
    };
  }

  /** Whether the current history entry is one this wizard pushed. */
  private isOwnHistoryEntry(): boolean {
    return (
      typeof history !== 'undefined' &&
      history.state?.[MnWizardBodyComponent.HISTORY_ID_KEY] === this.historyId &&
      history.state?.[MnWizardBodyComponent.HISTORY_STATE_KEY] != null &&
      typeof history.state?.[MnWizardBodyComponent.HISTORY_POS_KEY] === 'number'
    );
  }

  /** Push a history entry for the current step so browser Back stays inside the wizard. */
  private pushWizardHistory(): void {
    if (typeof history === 'undefined' || typeof history.pushState !== 'function') {
      return;
    }
    history.pushState(this.wizardHistoryState(this.historyDepth), '');
    this.historyDepth += 1;
  }

  /**
   * Re-points the current wizard entry at the step on screen. The UI Back button
   * goes to the previous *visible* step, which after a free-flow jump is not the
   * step the entry underneath was pushed for.
   */
  private syncWizardHistoryEntry(): void {
    if (typeof history === 'undefined' || typeof history.replaceState !== 'function') {
      return;
    }
    if (!this.isOwnHistoryEntry()) {
      return;
    }
    if (history.state[MnWizardBodyComponent.HISTORY_STATE_KEY] === this.currentStepId) {
      return;
    }
    history.replaceState(this.wizardHistoryState(this.historyDepth - 1), '');
  }

  /**
   * Browser Back / Forward (em8TA5ZU): show the step the entry was pushed for.
   * The entry's position, compared to {@link historyDepth}, says which way the
   * browser moved; leaving the first entry closes the wizard.
   */
  @HostListener('window:popstate')
  onBrowserBack(): void {
    if (this.ignorePopstate) {
      // Consume the popstate our own history.back() caused; no timer to race.
      this.ignorePopstate = false;
      this.syncWizardHistoryEntry();
      this.resolveUnwind?.();
      return;
    }
    if (!this.isOwnHistoryEntry()) {
      if (this.historyDepth <= 0) {
        return;
      }
      // Back past our first entry — close the wizard; the host page stays.
      this.historyDepth = 0;
      void this.dismissFromBrowserBack();
      return;
    }
    const stateStep = history.state[MnWizardBodyComponent.HISTORY_STATE_KEY] as ModalStepId;
    const statePos = history.state[MnWizardBodyComponent.HISTORY_POS_KEY] as number;
    const fromDepth = this.historyDepth;
    this.historyDepth = statePos + 1;
    if (stateStep === this.currentStepId) {
      return;
    }
    if (this.historyDepth > fromDepth) {
      void this.applyHistoryForward(stateStep, fromDepth);
      return;
    }
    void this.applyHistoryBack(stateStep);
  }

  /**
   * Apply a browser Forward. History has already advanced, so a step that may
   * not be left (invalid form, guard, validator) sends the browser back again.
   * @param stepId The step the restored entry was pushed for.
   * @param fromDepth {@link historyDepth} before the Forward, restored on refusal.
   */
  private async applyHistoryForward(stepId: ModalStepId, fromDepth: number): Promise<void> {
    const target = this.visibleSteps.find((s) => s.id === stepId);
    if (!target || !(await this.canLeaveCurrentStep()) || !(await this.canEnterStep(target))) {
      this.historyDepth = fromDepth;
      this.ignorePopstate = true;
      history.back();
      return;
    }
    const previousStepId = this.currentStepId;
    this.setCurrentStep(stepId);
    if (!this.visitedStepIds.includes(stepId)) {
      this.visitedStepIds.push(stepId);
    }
    await this.notifyStepChange(previousStepId, NavigationDirection.FORWARD);
    this.trackCurrentStepValidity();
  }

  /**
   * Apply a browser Back without touching history (history already moved).
   * @param stepId The step the restored entry was pushed for.
   */
  private async applyHistoryBack(stepId: ModalStepId): Promise<void> {
    const previousStepId = this.currentStepId;
    this.visitedStepIds = this.visitedStepIds.filter((id) => id !== this.currentStepId);
    this.setCurrentStep(stepId);
    await this.notifyStepChange(previousStepId, NavigationDirection.BACKWARD);
    this.trackCurrentStepValidity();
  }

  private async dismissFromBrowserBack(): Promise<void> {
    if (this.config.onCancel) {
      await this.config.onCancel(ModalCloseReason.CANCELLED);
    }
    this.modalRef.dismiss(ModalCloseReason.CANCELLED);
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
    const config: CustomModalConfig = { kind: ModalKind.CUSTOM, inputs: step.bodyInputs };
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
    if (formBody && (formBody.form.invalid || formBody.hasFormErrors)) {
      formBody.form.markAllAsTouched();
      return;
    }

    const previousStepId = this.currentStepId;
    this.setCurrentStep(step.id);

    if (!this.visitedStepIds.includes(this.currentStepId)) {
      this.visitedStepIds.push(this.currentStepId);
    }

    // A jump is a step of its own in history, so browser Back returns to where
    // the user jumped from rather than to the previous visible step.
    this.pushWizardHistory();
    await this.notifyStepChange(previousStepId, NavigationDirection.DIRECT);
    this.trackCurrentStepValidity();
  }

  ngOnDestroy(): void {
    this.statusSubscription?.unsubscribe();
    this.formBodiesSubscription?.unsubscribe();
    this.dropWizardHistory();
  }

  /**
   * Removes every entry this wizard pushed and waits until the browser is back
   * on the host entry. Complete runs it *before* the completion handler, so a
   * handler that navigates pushes its page right after the host entry instead
   * of on top of the wizard's entries, which would leave dead Back presses.
   * Resolves on the resulting popstate, or after a short fallback when none
   * arrives (no history API, or a test stub).
   */
  private async unwindWizardHistory(): Promise<void> {
    if (this.historyDepth <= 0) {
      return;
    }
    if (
      typeof history === 'undefined' ||
      typeof history.go !== 'function' ||
      !this.isOwnHistoryEntry()
    ) {
      this.historyDepth = 0;
      return;
    }
    const depth = this.historyDepth;
    this.historyDepth = 0;
    await new Promise<void>((resolve) => {
      const done = (): void => {
        clearTimeout(fallback);
        this.resolveUnwind = undefined;
        this.ignorePopstate = false;
        resolve();
      };
      const fallback = setTimeout(done, MnWizardBodyComponent.UNWIND_FALLBACK_MS);
      this.resolveUnwind = done;
      this.ignorePopstate = true;
      history.go(-depth);
    });
  }

  /**
   * Gives browser Back an entry to step on again after Complete unwound history
   * but the wizard stays open (the handler returned `false` or threw).
   */
  private restoreWizardHistoryEntry(): void {
    if (this.historyDepth === 0) {
      this.pushWizardHistory();
    }
  }

  /** Remove history entries we pushed when the wizard closes via Complete / X / Cancel. */
  private dropWizardHistory(): void {
    if (this.historyDepth <= 0) {
      return;
    }
    if (typeof history === 'undefined' || typeof history.go !== 'function') {
      this.historyDepth = 0;
      return;
    }
    const depth = this.historyDepth;
    this.historyDepth = 0;
    // Complete / the host may already have navigated away; only unwind while
    // the top entry is still ours, or the walk would leave the new page.
    if (!this.isOwnHistoryEntry()) {
      return;
    }
    history.go(-depth);
  }

  /**
   * Measures every step's natural height and records the tallest as
   * {@link measuredMinHeight}. Monotonic: the value only ever grows, so a
   * re-measure can never shrink the modal. Skipped when the modal has an
   * explicit height or is full-size (those are already fixed-height).
   */
  private measureTallestStep(): void {
    if (this.config.sizeHeight || this.config.sizeWidth === ModalSize.FULL) return;
    const wrappers = this.stepWrappers?.toArray().map((ref) => ref.nativeElement) ?? [];
    if (wrappers.length === 0) return;

    // Synchronous pre-paint pass: show one step at a time, read its height,
    // then restore the original display values (so there is no visible flicker).
    const originalDisplay = wrappers.map((el) => el.style.display);
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
    return this.config.steps.filter((s) => this.isStepVisible(s));
  }

  isStepVisible(step: WizardStepConfig): boolean {
    if (!step.visible) return true;
    return step.visible(this.getAggregatedData());
  }

  get currentStep() {
    return this.config.steps.find((s) => s.id === this.currentStepId);
  }

  get currentVisibleIndex(): number {
    return this.visibleSteps.findIndex((s) => s.id === this.currentStepId);
  }

  get currentStepIndex(): number {
    return this.config.steps.findIndex((s) => s.id === this.currentStepId);
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

  /**
   * Whether the current step may be left going forward: its form is valid
   * (touching every field when not), its exit guard allows it and its
   * validators pass. Shared by Next and browser Forward.
   */
  private async canLeaveCurrentStep(): Promise<boolean> {
    const currentStep = this.currentStep;

    // Validate embedded form if present
    const formBody = this.getCurrentFormBody();
    if (formBody && (formBody.form.invalid || formBody.hasFormErrors)) {
      formBody.form.markAllAsTouched();
      return false;
    }

    if (currentStep?.guard?.canExit) {
      const canExit = await currentStep.guard.canExit();
      if (!canExit) return false;
    }

    if (currentStep?.validators) {
      for (const validator of currentStep.validators) {
        const result = await validator.validate();
        if (result.status === 'invalid') return false;
      }
    }
    return true;
  }

  /**
   * Whether `step`'s enter guard lets the user in.
   * @param step The step about to become current.
   */
  private async canEnterStep(step: WizardStepConfig): Promise<boolean> {
    if (!step.guard?.canEnter) return true;
    return step.guard.canEnter();
  }

  async next(): Promise<void> {
    if (!this.canGoNext) return;

    if (!(await this.canLeaveCurrentStep())) return;

    // Find next visible step
    const nextStep = this.visibleSteps[this.currentVisibleIndex + 1];
    if (!nextStep) return;

    if (!(await this.canEnterStep(nextStep))) return;

    const previousStepId = this.currentStepId;
    this.setCurrentStep(nextStep.id);

    if (!this.visitedStepIds.includes(this.currentStepId)) {
      this.visitedStepIds.push(this.currentStepId);
    }

    this.pushWizardHistory();
    await this.notifyStepChange(previousStepId, NavigationDirection.FORWARD);
    this.trackCurrentStepValidity();
  }

  /** Find the MnFormBodyComponent for the current step */
  private getCurrentFormBody(): MnFormBodyComponent | undefined {
    if (!this.formBodies) return undefined;
    // formBodies only contains entries for steps that have stepFormConfigs
    // We need to find which form body index corresponds to the current step
    const formStepIds = this.config.steps
      .filter((s) => this.stepFormConfigs[s.id])
      .map((s) => s.id);
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
      const isValid = () => formBody.form.valid && !formBody.hasFormErrors;
      this.isCurrentStepValid = isValid();
      // formValidators errors refresh on valueChanges, not statusChanges
      this.statusSubscription = merge(
        formBody.form.statusChanges,
        formBody.form.valueChanges,
      ).subscribe(() => {
        this.isCurrentStepValid = isValid();
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
    this.visitedStepIds = this.visitedStepIds.filter((id) => id !== this.currentStepId);

    this.setCurrentStep(prevStep.id);

    // Drop the matching history entry without re-entering onBrowserBack (em8TA5ZU).
    this.popWizardHistoryEntry();

    await this.notifyStepChange(previousStepId, NavigationDirection.BACKWARD);
    this.trackCurrentStepValidity();
  }

  /**
   * Keeps history in step with the UI Back button. Pops one entry (ignoring the
   * resulting popstate, which then re-points the exposed entry at this step),
   * but never the first one: after a free-flow jump the wizard can still go back
   * while only one entry is ours, so that entry is re-pointed instead.
   */
  private popWizardHistoryEntry(): void {
    if (this.historyDepth <= 0) {
      return;
    }
    if (this.historyDepth === 1) {
      this.syncWizardHistoryEntry();
      return;
    }
    if (typeof history === 'undefined' || typeof history.back !== 'function') {
      this.historyDepth -= 1;
      return;
    }
    this.ignorePopstate = true;
    this.historyDepth -= 1;
    history.back();
  }

  /**
   * Activates a step and mirrors its title into {@link currentStepTitle} so the
   * shell can reflect the step name in the modal title on small screens.
   * @param stepId Id of the step to make current.
   */
  private setCurrentStep(stepId: ModalStepId): void {
    this.currentStepId = stepId;
    this.currentStepTitle.set(this.config.steps.find((s) => s.id === stepId)?.title);
    // A new step always starts at its top — the shared scroller would otherwise
    // keep the previous step's offset. Instant, not smooth: a scroll animation
    // during a step swap reads as a glitch. Absent before the view is created.
    if (this.stepScroller) {
      this.stepScroller.nativeElement.scrollTop = 0;
    }
  }

  async complete(): Promise<void> {
    if (this.isCompleting) return;

    const currentStep = this.currentStep;

    // Validate embedded form if present
    const formBody = this.getCurrentFormBody();
    if (formBody && (formBody.form.invalid || formBody.hasFormErrors)) {
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

      // Leave history as it was before the wizard opened, so a handler that
      // navigates lands its page directly after the host page.
      await this.unwindWizardHistory();

      // `false` keeps the wizard open so a rejected submit does not wipe the form.
      // Throwing takes the catch path below and also keeps it open.
      const keepOpen =
        this.config.onComplete != null &&
        (await this.config.onComplete.handle(result)) === false;

      if (keepOpen) {
        this.restoreWizardHistoryEntry();
        this.isCompleting = false;
        this.cdr.detectChanges();
        return;
      }

      this.modalRef.close(result);
    } catch (error) {
      this.restoreWizardHistoryEntry();
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
      .filter((s) => this.stepFormConfigs[s.id])
      .map((s) => s.id);

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
        return { variant: 'text', color: 'gray' };
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
      this.modalRef.close(
        (action.closeReason || ModalCloseReason.PROGRAMMATIC) as unknown as WizardResult,
      );
    }
  }

  private async notifyStepChange(
    previousStepId: ModalStepId,
    direction: NavigationDirection,
  ): Promise<void> {
    if (this.config.onStepChange) {
      await this.config.onStepChange.handle({
        previousStepId,
        currentStepId: this.currentStepId,
        direction,
      });
    }
  }
}
