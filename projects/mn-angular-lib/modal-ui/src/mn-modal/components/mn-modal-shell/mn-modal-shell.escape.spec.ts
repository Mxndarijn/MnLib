import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MnModalShellComponent} from './mn-modal-shell.component';
import {CloseMode, KeyboardMode, ModalBuilder, ModalCloseReason, ModalConfig, MnModalRef} from 'mn-angular-lib';

/**
 * Escape closes the top modal, and nothing else.
 *
 * It used to close a modal only when its builder opted in with `KeyboardMode.ENABLED`, which no
 * caller did, so Escape closed no modal at all. Every open shell listens on `document`, so the
 * same press reaches all of them: only the top one may act, or one Escape would empty the stack.
 */
describe('MnModalShellComponent Escape', () => {
  let fixture: ComponentFixture<MnModalShellComponent>;
  let comp: MnModalShellComponent;
  let dismiss: jasmine.Spy;

  /** The builder a test opens, so it can set what it needs before the config is frozen. */
  type Builder = ReturnType<typeof ModalBuilder.confirmation<boolean>>;

  /** A plain confirmation, with whatever the test sets on its builder. */
  function open(tweak: (builder: Builder) => Builder = (builder) => builder): void {
    const config = tweak(ModalBuilder.confirmation<boolean>().title('T').message('M')).build() as unknown as ModalConfig;
    fixture = TestBed.createComponent(MnModalShellComponent);
    comp = fixture.componentInstance;
    comp.config = config;
    dismiss = jasmine.createSpy('dismiss');
    comp.modalRef = {dismiss} as unknown as MnModalRef;
    fixture.detectChanges();
  }

  /** Presses Escape on the document, as a keyboard user would. */
  function pressEscape(): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
    document.dispatchEvent(event);
    return event;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnModalShellComponent, HttpClientTestingModule],
    }).compileComponents();
  });

  it('closes a modal on Escape without any opt-in', () => {
    open();
    const event = pressEscape();
    expect(dismiss).toHaveBeenCalledOnceWith(ModalCloseReason.ESCAPE);
    expect(event.defaultPrevented).toBeTrue();
  });

  it('stays open when the modal opted out', () => {
    open((builder) => builder.keyboard(KeyboardMode.DISABLED));
    pressEscape();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('stays open when the modal may not be closed at all', () => {
    open((builder) => builder.closeMode(CloseMode.DISABLED));
    pressEscape();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('leaves a modal under another one alone, so one press closes one modal', () => {
    open();
    comp.isStacked.set(true);
    pressEscape();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('leaves the Escape to an open dropdown inside the modal', () => {
    open();
    const trigger = document.createElement('button');
    trigger.setAttribute('aria-expanded', 'true');
    (fixture.nativeElement as HTMLElement).appendChild(trigger);
    pressEscape();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('leaves an Escape that something inside already took', () => {
    open();
    const event = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
    event.preventDefault();
    document.dispatchEvent(event);
    expect(dismiss).not.toHaveBeenCalled();
  });
});
