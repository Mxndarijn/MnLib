import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  MnModalRef,
  MnWizardBodyComponent,
  ModalKind,
  WizardFlowMode,
  WizardModalConfig,
  WizardResult,
} from 'mn-angular-lib';

/** Minimal step-body component used to assert input + modalRef wiring. */
@Component({
  selector: 'mn-lib-test-step-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<div class="test-step-body">{{ associationId }}</div>',
})
class TestStepBodyComponent {
  /** Arbitrary input, asserted to be populated from `bodyInputs`. */
  @Input() associationId?: string;

  /** Populated automatically by the custom-body host. */
  modalRef?: MnModalRef<unknown>;
}

function createMockModalRef(): MnModalRef<unknown> {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: {
      subscribe: () => {},
    },
  } as unknown as MnModalRef<unknown>;
}

describe('MnWizardBodyComponent', () => {
  let fixture: ComponentFixture<MnWizardBodyComponent>;
  let component: MnWizardBodyComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnWizardBodyComponent, HttpClientTestingModule],
    }).compileComponents();
    // A destroyed wizard unwinds its entries with history.go; a real traversal
    // would land its popstate on the next spec's wizard.
    spyOn(history, 'go');
  });

  function setup(config: WizardModalConfig): void {
    fixture = TestBed.createComponent(MnWizardBodyComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.modalRef = createMockModalRef() as unknown as MnModalRef<WizardResult>;
    fixture.detectChanges();
  }

  it('pre-builds a host config for a component-body step, carrying its inputs', () => {
    setup({
      kind: ModalKind.WIZARD,
      steps: [
        {
          id: 'preview',
          title: 'Preview',
          body: TestStepBodyComponent,
          bodyInputs: { associationId: 'assoc-1' },
        },
      ],
    } as WizardModalConfig);

    const built = component.stepBodyConfigs['preview'];
    expect(built).toBeTruthy();
    expect(built.component).toBe(TestStepBodyComponent);
    expect(built.inputs).toEqual({ associationId: 'assoc-1' });
    expect(built.template).toBeUndefined();
  });

  it('does not pre-build a host config for a plain-string body step', () => {
    setup({
      kind: ModalKind.WIZARD,
      steps: [{ id: 'intro', title: 'Intro', body: 'Just some text' }],
    } as WizardModalConfig);

    expect(component.stepBodyConfigs['intro']).toBeUndefined();
  });

  it('does not pre-build a host config for a form-field step', () => {
    setup({
      kind: ModalKind.WIZARD,
      steps: [
        {
          id: 'form',
          title: 'Form',
          fields: [{ kind: 'text', key: 'name', label: 'Name' } as never],
        },
      ],
    } as WizardModalConfig);

    expect(component.stepBodyConfigs['form']).toBeUndefined();
  });

  it('renders the component body and wires its inputs and modalRef', fakeAsync(() => {
    setup({
      kind: ModalKind.WIZARD,
      steps: [
        {
          id: 'preview',
          title: 'Preview',
          body: TestStepBodyComponent,
          bodyInputs: { associationId: 'assoc-42' },
        },
      ],
    } as WizardModalConfig);

    // The custom-body host attaches its component on a macrotask.
    tick();
    fixture.detectChanges();

    const rendered = fixture.debugElement.query(By.directive(TestStepBodyComponent));
    expect(rendered).toBeTruthy();
    const instance = rendered.componentInstance as TestStepBodyComponent;
    expect(instance.associationId).toBe('assoc-42');
    expect(instance.modalRef).toBe(component.modalRef as unknown as MnModalRef<unknown>);
  }));

  /**
   * Every step renders into one shared scroll container (inactive steps are hidden,
   * not destroyed), so navigating used to drop the user halfway down the new step —
   * wherever the previous one happened to be scrolled to.
   */
  describe('step body scroll position', () => {
    /**
     * A three-step wizard whose scroller is forced to overflow. FREE flow so the
     * direct-jump case is reachable — `goToStep` is a no-op under LINEAR by design.
     */
    function setupScrollable(): HTMLElement {
      setup({
        kind: ModalKind.WIZARD,
        flow: WizardFlowMode.FREE,
        steps: [
          { id: 'one', title: 'One', body: 'First step' },
          { id: 'two', title: 'Two', body: 'Second step' },
          { id: 'three', title: 'Three', body: 'Third step' },
        ],
      } as WizardModalConfig);

      const scroller = component.stepScroller!.nativeElement;
      // The harness has no layout constraints, so give the scroller a real overflow.
      scroller.style.height = '50px';
      scroller.style.overflowY = 'auto';
      const filler = document.createElement('div');
      filler.style.height = '500px';
      scroller.appendChild(filler);
      return scroller;
    }

    it('scrolls back to the top when advancing to the next step', async () => {
      const scroller = setupScrollable();
      scroller.scrollTop = 200;
      expect(scroller.scrollTop)
        .withContext('harness must actually be scrollable')
        .toBeGreaterThan(0);

      await component.next();
      fixture.detectChanges();

      expect(component.currentStepId).toBe('two');
      expect(scroller.scrollTop).toBe(0);
    });

    it('scrolls back to the top when going back a step', async () => {
      const scroller = setupScrollable();
      await component.next();
      scroller.scrollTop = 200;
      expect(scroller.scrollTop).toBeGreaterThan(0);

      await component.back();
      fixture.detectChanges();

      expect(component.currentStepId).toBe('one');
      expect(scroller.scrollTop).toBe(0);
    });

    it('scrolls back to the top when jumping straight to a step', async () => {
      const scroller = setupScrollable();
      scroller.scrollTop = 200;

      await component.goToStep(component.config.steps[2]);
      fixture.detectChanges();

      expect(component.currentStepId).toBe('three');
      expect(scroller.scrollTop).toBe(0);
    });
  });

  describe('browser Back (em8TA5ZU)', () => {
    /** Gates leaving the first step, to exercise a refused Forward. */
    let allowExit = true;

    // Wizards in other spec files unwind with the real history.go; let their
    // late popstates land before this block's wizard starts listening.
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    /** The id the wizard under test tags its history entries with. */
    let ownId: unknown;

    /** A history entry of the wizard under test. */
    function entry(step: string, pos: number): Record<string, unknown> {
      return { mnWizard: step, mnWizardPos: pos, mnWizardId: ownId };
    }

    function setupSteps(flow: WizardFlowMode, ids: string[], startStepId?: string): void {
      allowExit = true;
      setup({
        kind: ModalKind.WIZARD,
        flow,
        startStepId,
        steps: ids.map((id, i) => ({
          id,
          title: id,
          body: `Body ${id}`,
          guard: i === 0 ? { canExit: () => allowExit } : undefined,
        })),
      } as WizardModalConfig);
      ownId = history.state?.mnWizardId;
    }

    /** Lands the browser on `state` the way a real Back / Forward does, then settles. */
    async function popTo(state: Record<string, unknown>): Promise<void> {
      history.replaceState(state, '');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    }

    it('steps back on popstate instead of leaving the wizard on step 2', async () => {
      setupSteps(WizardFlowMode.LINEAR, ['one', 'two']);
      await component.next();
      expect(component.currentStepId).toBe('two');

      await popTo(entry('one', 0));

      expect(component.currentStepId).toBe('one');
      expect(component.modalRef.dismiss).not.toHaveBeenCalled();
    });

    it('steps forward on popstate when the entry is further along', async () => {
      setupSteps(WizardFlowMode.LINEAR, ['one', 'two']);
      await component.next();

      await popTo(entry('one', 0));
      expect(component.currentStepId).toBe('one');

      await popTo(entry('two', 1));

      expect(component.currentStepId).toBe('two');
      expect(component.modalRef.dismiss).not.toHaveBeenCalled();
    });

    it('refuses Forward, sending the browser back, when the step may not be left', async () => {
      setupSteps(WizardFlowMode.LINEAR, ['one', 'two']);
      await component.next();
      await popTo(entry('one', 0));
      allowExit = false;
      const back = spyOn(history, 'back');

      await popTo(entry('two', 1));

      expect(component.currentStepId).toBe('one');
      expect(back).toHaveBeenCalledTimes(1);
    });

    it('returns to the step jumped from, not the previous visible step (free flow)', async () => {
      setupSteps(WizardFlowMode.FREE, ['one', 'two', 'three', 'four']);
      await component.goToStep(component.visibleSteps[3]);
      expect(component.currentStepId).toBe('four');
      expect(history.state).toEqual(entry('four', 1));

      await popTo(entry('one', 0));

      expect(component.currentStepId).toBe('one');
      expect(component.modalRef.dismiss).not.toHaveBeenCalled();
    });

    it('re-points its only entry, not pops it, on UI Back from a later start step', async () => {
      setupSteps(WizardFlowMode.FREE, ['one', 'two', 'three'], 'three');
      const back = spyOn(history, 'back');

      await component.back();

      expect(component.currentStepId).toBe('two');
      expect(back).not.toHaveBeenCalled();
      expect(history.state).toEqual(entry('two', 0));
    });

    /** A one-step wizard whose completion handler is `handle`. */
    function setupCompleting(handle: () => Promise<void | boolean>): void {
      setup({
        kind: ModalKind.WIZARD,
        steps: [{ id: 'only', title: 'Only', body: 'Only' }],
        onComplete: { handle },
      } as WizardModalConfig);
      ownId = history.state?.mnWizardId;
    }

    it('unwinds its history before the completion handler runs (no dead Back after a navigate)', async () => {
      const go = history.go as jasmine.Spy;
      let goCallsWhenHandled = -1;
      setupCompleting(async () => {
        goCallsWhenHandled = go.calls.count();
      });

      await component.complete();

      expect(go).toHaveBeenCalledOnceWith(-1);
      expect(goCallsWhenHandled).toBe(1);
      expect(component.modalRef.close).toHaveBeenCalled();
      // Already unwound: closing must not walk history a second time.
      fixture.destroy();
      expect(go).toHaveBeenCalledTimes(1);
    });

    it('pushes an entry again when the completion handler fails (wizard stays open)', async () => {
      setupCompleting(async () => {
        throw new Error('save failed');
      });
      spyOn(console, 'error');

      await component.complete();

      expect(component.modalRef.close).not.toHaveBeenCalled();
      expect(history.state).toEqual(entry('only', 0));
    });

    it('pushes an entry again when onComplete returns false (wizard stays open)', async () => {
      setupCompleting(async () => false);

      await component.complete();

      expect(component.modalRef.close).not.toHaveBeenCalled();
      expect(history.state).toEqual(entry('only', 0));
    });

    it('dismisses the wizard on popstate at the first step (host page stays)', async () => {
      setupSteps(WizardFlowMode.LINEAR, ['one', 'two']);
      expect(component.currentStepId).toBe('one');

      // Leaving the first wizard entry drops mnWizard from history.state.
      await popTo({ host: true });

      expect(component.modalRef.dismiss).toHaveBeenCalled();
    });

    it('does not walk history on destroy when the top entry is not the wizard\'s', async () => {
      setupSteps(WizardFlowMode.LINEAR, ['one', 'two']);
      await component.next();
      history.pushState({ host: 'elsewhere' }, '');
      const go = history.go as jasmine.Spy;

      fixture.destroy();

      expect(go).not.toHaveBeenCalled();
    });
  });

  describe('complete keep-open', () => {
    it('closes when onComplete returns void', async () => {
      const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve()) };
      setup({
        kind: ModalKind.WIZARD,
        steps: [{ id: 'one', title: 'One', body: 'First step' }],
        onComplete: handler,
      } as WizardModalConfig);

      await component.complete();

      expect(handler.handle).toHaveBeenCalled();
      expect(component.modalRef.close).toHaveBeenCalled();
    });

    it('keeps the wizard open when onComplete returns false', async () => {
      const handler = { handle: jasmine.createSpy('handle').and.returnValue(Promise.resolve(false)) };
      setup({
        kind: ModalKind.WIZARD,
        steps: [{ id: 'one', title: 'One', body: 'First step' }],
        onComplete: handler,
      } as WizardModalConfig);

      await component.complete();

      expect(handler.handle).toHaveBeenCalled();
      expect(component.modalRef.close).not.toHaveBeenCalled();
      expect(component.isCompleting).toBeFalse();
    });

    it('keeps the wizard open when onComplete throws', async () => {
      const handler = {
        handle: jasmine.createSpy('handle').and.returnValue(Promise.reject(new Error('rejected'))),
      };
      setup({
        kind: ModalKind.WIZARD,
        steps: [{ id: 'one', title: 'One', body: 'First step' }],
        onComplete: handler,
      } as WizardModalConfig);

      await component.complete();

      expect(handler.handle).toHaveBeenCalled();
      expect(component.modalRef.close).not.toHaveBeenCalled();
      expect(component.isCompleting).toBeFalse();
    });
  });

  describe('formValidators errors', () => {
    function setupWithFormValidator(): void {
      setup({
        kind: ModalKind.WIZARD,
        steps: [
          {
            id: 'one',
            title: 'One',
            fields: [{ kind: 'text', key: 'name', label: 'Name' } as never],
            formValidators: [
              (value: Record<string, unknown>) =>
                value['name'] === 'bad' ? { name: 'Name is not allowed' } : null,
            ],
          },
          { id: 'two', title: 'Two', body: 'Second step' },
        ],
      } as unknown as WizardModalConfig);
    }

    it('blocks next() and disables the step while formValidators report errors', async () => {
      setupWithFormValidator();
      const formBody = component.formBodies.first;
      formBody.form.get('name')!.setValue('bad');
      fixture.detectChanges();

      expect(formBody.form.valid).withContext('controls stay valid').toBeTrue();
      expect(formBody.hasFormErrors).toBeTrue();
      expect(component.isCurrentStepValid).toBeFalse();

      await component.next();
      fixture.detectChanges();

      expect(component.currentStepId).toBe('one');
    });

    it('advances once the formValidators error is cleared', async () => {
      setupWithFormValidator();
      const formBody = component.formBodies.first;
      formBody.form.get('name')!.setValue('bad');
      formBody.form.get('name')!.setValue('good');
      fixture.detectChanges();

      expect(formBody.hasFormErrors).toBeFalse();
      expect(component.isCurrentStepValid).toBeTrue();

      await component.next();
      fixture.detectChanges();

      expect(component.currentStepId).toBe('two');
    });
  });
});
