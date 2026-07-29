import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MnModalShellComponent} from './mn-modal-shell.component';
import {ModalBuilder} from '../../builder';
import {MnModalRef} from '../../mn-modal-ref';
import {BackdropMode, ModalConfig} from '../../mn-modal.types';

/**
 * Regression coverage for the shell's click propagation contract.
 *
 * The container used to carry `(click)="$event.stopPropagation()"`, which swallowed
 * every click before it reached `document`. Any component inside a modal that closes
 * itself on an outside click via a `document:click` listener — the multi-select's
 * portalled panel, the table's filter popover — therefore never closed. The backdrop
 * is a sibling of the container, not an ancestor, so nothing needed that guard.
 */
describe('MnModalShellComponent click propagation', () => {
  let fixture: ComponentFixture<MnModalShellComponent>;
  let comp: MnModalShellComponent;
  let dismiss: jasmine.Spy;

  /** A closable-backdrop confirmation, so an accidental backdrop close would be observable. */
  function config(): ModalConfig {
    return ModalBuilder.confirmation<boolean>()
      .title('T')
      .message('M')
      .backdrop(BackdropMode.CLOSABLE)
      .build() as unknown as ModalConfig;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnModalShellComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MnModalShellComponent);
    comp = fixture.componentInstance;
    comp.config = config();
    dismiss = jasmine.createSpy('dismiss');
    comp.modalRef = {dismiss} as unknown as MnModalRef;
    fixture.detectChanges();
  });

  it('lets clicks inside the modal container reach document listeners', () => {
    const onDocumentClick = jasmine.createSpy('onDocumentClick');
    document.addEventListener('click', onDocumentClick);

    try {
      const container = fixture.nativeElement.querySelector('.modal-container') as HTMLElement;
      expect(container).withContext('shell must render a container').not.toBeNull();

      container.dispatchEvent(new MouseEvent('click', {bubbles: true}));

      expect(onDocumentClick)
        .withContext('a click inside the modal must still bubble to document')
        .toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('click', onDocumentClick);
    }
  });

  it('does not dismiss the modal when a click inside the container bubbles out', () => {
    const container = fixture.nativeElement.querySelector('.modal-container') as HTMLElement;
    container.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    // The backdrop is a sibling element, so bubbling past the container never reaches it.
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('still dismisses on a real backdrop click', () => {
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop') as HTMLElement;
    expect(backdrop).withContext('closable modal must render a backdrop').not.toBeNull();

    backdrop.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
