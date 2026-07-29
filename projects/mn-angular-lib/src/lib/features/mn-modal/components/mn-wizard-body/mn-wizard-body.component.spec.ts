import {Component, Input} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MnModalRef, MnWizardBodyComponent, ModalKind, WizardFlowMode, WizardModalConfig, WizardResult,} from '../..';

/** Minimal step-body component used to assert input + modalRef wiring. */
@Component({
  selector: 'mn-lib-test-step-body',
  standalone: true,
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
      subscribe: () => {
      }
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
        {id: 'preview', title: 'Preview', body: TestStepBodyComponent, bodyInputs: {associationId: 'assoc-1'}},
      ],
    } as WizardModalConfig);

    const built = component.stepBodyConfigs['preview'];
    expect(built).toBeTruthy();
    expect(built.component).toBe(TestStepBodyComponent);
    expect(built.inputs).toEqual({associationId: 'assoc-1'});
    expect(built.template).toBeUndefined();
  });

  it('does not pre-build a host config for a plain-string body step', () => {
    setup({
      kind: ModalKind.WIZARD,
      steps: [{id: 'intro', title: 'Intro', body: 'Just some text'}],
    } as WizardModalConfig);

    expect(component.stepBodyConfigs['intro']).toBeUndefined();
  });

  it('does not pre-build a host config for a form-field step', () => {
    setup({
      kind: ModalKind.WIZARD,
      steps: [
        {id: 'form', title: 'Form', fields: [{kind: 'text', key: 'name', label: 'Name'} as never]},
      ],
    } as WizardModalConfig);

    expect(component.stepBodyConfigs['form']).toBeUndefined();
  });

  it('renders the component body and wires its inputs and modalRef', fakeAsync(() => {
    setup({
      kind: ModalKind.WIZARD,
      steps: [
        {id: 'preview', title: 'Preview', body: TestStepBodyComponent, bodyInputs: {associationId: 'assoc-42'}},
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
          {id: 'one', title: 'One', body: 'First step'},
          {id: 'two', title: 'Two', body: 'Second step'},
          {id: 'three', title: 'Three', body: 'Third step'},
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
      expect(scroller.scrollTop).withContext('harness must actually be scrollable').toBeGreaterThan(0);

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
});
