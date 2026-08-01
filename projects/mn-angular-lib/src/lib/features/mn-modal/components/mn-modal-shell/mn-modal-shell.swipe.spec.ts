import {TestBed} from '@angular/core/testing';
import {MnModalShellComponent} from './mn-modal-shell.component';
import {ModalBuilder} from '../../builder';
import {MnModalRef} from '../../mn-modal-ref';
import {CloseMode, ModalConfig} from '../../mn-modal.types';
import {MN_HAPTICS, MnHapticsHandler} from '../../mn-modal-haptics';

/** Builds a minimal confirmation config, cast to the shell's erased TResult (as the
 *  real MnModalService.open does via its generic signature). */
function confirmationConfig(): ModalConfig {
  return ModalBuilder.confirmation<boolean>().title('T').message('M').build() as unknown as ModalConfig;
}

/**
 * Unit coverage for the shell's side of the bottom-sheet dismissal contract.
 *
 * The gesture mechanics (distance/flick thresholds, spring-back) now live in — and are
 * tested against — mn-bottom-sheet. What remains the shell's responsibility is the
 * dismissal *policy* it hands the sheet: the `dismissGuard` mirroring DISABLED/GUARDED
 * close modes, and the `(dismiss)` handler that closes the modal with a confirming haptic.
 */
describe('MnModalShellComponent sheet dismissal', () => {
  let comp: MnModalShellComponent;
  let haptics: jasmine.SpyObj<MnHapticsHandler>;
  let dismiss: jasmine.Spy;

  beforeEach(() => {
    haptics = jasmine.createSpyObj<MnHapticsHandler>('haptics', ['impact']);
    TestBed.configureTestingModule({
      providers: [{provide: MN_HAPTICS, useValue: haptics}],
    });
    const fixture = TestBed.createComponent(MnModalShellComponent);
    comp = fixture.componentInstance;
    comp.config = confirmationConfig();
    dismiss = jasmine.createSpy('dismiss');
    comp.modalRef = {dismiss} as unknown as MnModalRef;
  });

  it('onSheetDismiss dismisses the modal with a confirming haptic', () => {
    comp.onSheetDismiss();

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(haptics.impact).toHaveBeenCalledWith('medium');
  });

  it('lets a normal modal be swiped away', async () => {
    expect(await comp.sheetDismissGuard()).toBeTrue();
  });

  it('blocks a swipe on a DISABLED modal', async () => {
    comp.config = {...confirmationConfig(), closeMode: CloseMode.DISABLED} as ModalConfig;
    expect(await comp.sheetDismissGuard()).toBeFalse();
  });

  it('defers a swipe to the close guard when GUARDED', async () => {
    const closeGuard = jasmine.createSpy('closeGuard').and.returnValue(Promise.resolve(false));
    comp.config = {...confirmationConfig(), closeMode: CloseMode.GUARDED, closeGuard} as ModalConfig;

    expect(await comp.sheetDismissGuard()).toBeFalse();
    expect(closeGuard).toHaveBeenCalledTimes(1);

    closeGuard.and.returnValue(Promise.resolve(true));
    expect(await comp.sheetDismissGuard()).toBeTrue();
  });

  it('does not emit any haptic merely on opening (only dismissal ticks)', () => {
    comp.ngAfterViewInit();
    expect(haptics.impact).not.toHaveBeenCalled();
  });
});

/**
 * The haptics hook is optional: with no MN_HAPTICS provided the shell must dismiss
 * identically and never throw.
 */
describe('MnModalShellComponent sheet dismissal without a haptics handler', () => {
  let comp: MnModalShellComponent;
  let dismiss: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(MnModalShellComponent);
    comp = fixture.componentInstance;
    comp.config = confirmationConfig();
    dismiss = jasmine.createSpy('dismiss');
    comp.modalRef = {dismiss} as unknown as MnModalRef;
  });

  it('still dismisses on a sheet dismissal and does not throw', () => {
    expect(() => comp.onSheetDismiss()).not.toThrow();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
