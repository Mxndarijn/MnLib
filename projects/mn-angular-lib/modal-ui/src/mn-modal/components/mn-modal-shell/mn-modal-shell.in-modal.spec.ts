import {Component, inject} from '@angular/core';
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {By} from '@angular/platform-browser';
import {MnModalShellComponent} from './mn-modal-shell.component';
import {MN_IN_MODAL, ModalBuilder, ModalConfig, MnModalRef} from 'mn-angular-lib';

/** A custom modal body that records whether it can tell it is in a modal. */
@Component({
  standalone: true,
  template: '<p>probe</p>',
})
class ProbeComponent {
  readonly inModal = inject(MN_IN_MODAL);
}

/**
 * Everything a modal renders can tell it is in one, without the consumer passing anything.
 * mn-table relies on it to skip its own bottom sheet in a modal body; a body component is
 * created inside the shell's view, so it must inherit the shell's provider.
 */
describe('MnModalShellComponent MN_IN_MODAL', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnModalShellComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  it('is false outside a modal', () => {
    expect(TestBed.inject(MN_IN_MODAL)).toBeFalse();
  });

  it('is true for a custom body rendered by the shell', fakeAsync(() => {
    const config = ModalBuilder.custom().title('T').component(ProbeComponent).build() as unknown as ModalConfig;
    const fixture = TestBed.createComponent(MnModalShellComponent);
    fixture.componentInstance.config = config;
    fixture.componentInstance.modalRef = {dismiss: () => undefined} as unknown as MnModalRef;
    fixture.detectChanges();
    // The custom body host attaches its component on a timeout after init.
    tick();
    fixture.detectChanges();

    const probe = fixture.debugElement.query(By.directive(ProbeComponent));
    expect(probe).not.toBeNull();
    expect((probe.componentInstance as ProbeComponent).inModal).toBeTrue();
  }));
});
