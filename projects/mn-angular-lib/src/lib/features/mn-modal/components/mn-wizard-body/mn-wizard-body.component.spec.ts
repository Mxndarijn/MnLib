import {Component, Input} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MnModalRef, MnWizardBodyComponent, ModalKind, WizardModalConfig, WizardResult,} from '../..';

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
});
