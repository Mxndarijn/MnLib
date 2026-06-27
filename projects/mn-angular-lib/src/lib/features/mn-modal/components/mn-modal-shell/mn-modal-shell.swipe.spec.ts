import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MnModalShellComponent} from './mn-modal-shell.component';
import {ModalBuilder} from '../../builder';
import {MnModalRef} from '../../mn-modal-ref';
import {ModalConfig} from '../../mn-modal.types';
import {MN_HAPTICS, MnHapticsHandler} from '../../mn-modal-haptics';

/** Builds a minimal confirmation config, cast to the shell's erased TResult (as the
 *  real MnModalService.open does via its generic signature). */
function confirmationConfig(): ModalConfig {
  return ModalBuilder.confirmation<boolean>().title('T').message('M').build() as unknown as ModalConfig;
}

/**
 * Unit coverage for the bottom-sheet swipe gesture: distance-based dismiss, the new
 * velocity (flick) dismiss, spring-back, and the optional native haptics hook.
 *
 * Pointer events are passed as lightweight stubs so `clientY` and `timeStamp` are fully
 * controllable (a real PointerEvent stamps its own `timeStamp`, making velocity
 * non-deterministic). The component is created but never rendered — the gesture logic
 * runs entirely off the instance, independent of the view.
 */
describe('MnModalShellComponent swipe-to-dismiss', () => {
  let fixture: ComponentFixture<MnModalShellComponent>;
  let comp: MnModalShellComponent;
  let haptics: jasmine.SpyObj<MnHapticsHandler>;
  let dismiss: jasmine.Spy;
  let originalInnerWidth: number;

  /** A detached element standing in for the pointer event target. */
  let target: HTMLElement;

  function build(comp: MnModalShellComponent): void {
    comp.config = confirmationConfig();
    dismiss = jasmine.createSpy('dismiss');
    comp.modalRef = {dismiss} as unknown as MnModalRef;
  }

  /** Forces a mobile-width viewport so the sheet gesture is armed. */
  function setNarrowViewport(): void {
    Object.defineProperty(window, 'innerWidth', {value: 400, configurable: true});
  }

  function down(y: number, t: number): void {
    comp.onSheetPointerDown({clientY: y, timeStamp: t, pointerId: 1, target} as unknown as PointerEvent);
  }

  function move(y: number, t: number): void {
    comp.onSheetPointerMove({clientY: y, timeStamp: t, pointerId: 1, target} as unknown as PointerEvent);
  }

  beforeEach(() => {
    haptics = jasmine.createSpyObj<MnHapticsHandler>('haptics', ['impact']);
    TestBed.configureTestingModule({
      providers: [{provide: MN_HAPTICS, useValue: haptics}],
    });
    fixture = TestBed.createComponent(MnModalShellComponent);
    comp = fixture.componentInstance;
    build(comp);

    target = document.createElement('div');
    // setPointerCapture throws without a live pointer; the gesture only needs the call to exist.
    target.setPointerCapture = () => undefined;

    originalInnerWidth = window.innerWidth;
    setNarrowViewport();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {value: originalInnerWidth, configurable: true});
  });

  it('dismisses on a long drag past the distance threshold', async () => {
    down(100, 0);
    move(280, 400); // 180px over 400ms => 0.45 px/ms (below flick speed) but past 150px distance
    await comp.onSheetPointerUp();

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(haptics.impact).toHaveBeenCalledWith('medium');
    expect(comp.swipeDismissing).toBe(true);
  });

  it('dismisses on a fast downward flick even when the drag is short', async () => {
    down(100, 0);
    move(170, 10); // 70px over 10ms => 7 px/ms, well above the flick threshold
    await comp.onSheetPointerUp();

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(haptics.impact).toHaveBeenCalledWith('medium');
  });

  it('springs back (no dismiss) on a slow, short drag', async () => {
    down(100, 0);
    move(112, 300); // 12px over 300ms => slow and short
    await comp.onSheetPointerUp();

    expect(dismiss).not.toHaveBeenCalled();
    expect(comp.sheetDragY).toBe(0);
    expect(haptics.impact).toHaveBeenCalledWith('light'); // snap-back tick
  });

  it('does not flick-dismiss a fast move that never travelled far enough', async () => {
    down(100, 0);
    move(120, 2); // 20px over 2ms => 10 px/ms but only 20px (< flick min distance)
    await comp.onSheetPointerUp();

    expect(dismiss).not.toHaveBeenCalled();
    expect(comp.sheetDragY).toBe(0);
  });

  it('emits a light haptic as the sheet opens on a mobile viewport', () => {
    comp.ngAfterViewInit();
    expect(haptics.impact).toHaveBeenCalledWith('light');
  });
});

/**
 * The haptics hook is optional: with no MN_HAPTICS provided the sheet must behave
 * identically and never throw.
 */
describe('MnModalShellComponent swipe-to-dismiss without a haptics handler', () => {
  let comp: MnModalShellComponent;
  let dismiss: jasmine.Spy;
  let target: HTMLElement;
  let originalInnerWidth: number;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(MnModalShellComponent);
    comp = fixture.componentInstance;
    comp.config = confirmationConfig();
    dismiss = jasmine.createSpy('dismiss');
    comp.modalRef = {dismiss} as unknown as MnModalRef;

    target = document.createElement('div');
    target.setPointerCapture = () => undefined;
    originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {value: 400, configurable: true});
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {value: originalInnerWidth, configurable: true});
  });

  it('still dismisses on a flick and does not throw', async () => {
    comp.onSheetPointerDown({clientY: 100, timeStamp: 0, pointerId: 1, target} as unknown as PointerEvent);
    comp.onSheetPointerMove({clientY: 180, timeStamp: 10, pointerId: 1, target} as unknown as PointerEvent);
    await comp.onSheetPointerUp();

    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
