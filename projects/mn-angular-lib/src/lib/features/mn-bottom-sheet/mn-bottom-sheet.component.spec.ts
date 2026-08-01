import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {MnBottomSheet} from './mn-bottom-sheet.component';

/**
 * Host that projects a marker body into the sheet, so the tests can exercise the
 * component through its real content-projection surface and read its emitted events.
 */
@Component({
  standalone: true,
  imports: [MnBottomSheet],
  template: `
    <mn-bottom-sheet
      [showBackdrop]="showBackdrop"
      [showGrabber]="showGrabber"
      [dismissible]="dismissible"
      [minHeightPx]="minHeightPx"
      [maxHeightVh]="maxHeightVh"
      [containerClass]="containerClass"
      (dismiss)="dismissed = dismissed + 1"
    >
      <div class="projected-body">Body</div>
    </mn-bottom-sheet>
  `,
})
class HostComponent {
  @ViewChild(MnBottomSheet) sheet!: MnBottomSheet;
  showBackdrop = true;
  showGrabber = true;
  dismissible = true;
  minHeightPx: number | null = null;
  maxHeightVh = 80;
  containerClass = '';
  dismissed = 0;
}

/** A synthetic pointer event good enough for the handlers (they read a small surface). */
function ptr(clientY: number, timeStamp: number): PointerEvent {
  return {
    clientY,
    timeStamp,
    pointerId: 1,
    target: {closest: () => null, setPointerCapture: () => undefined},
  } as unknown as PointerEvent;
}

describe('MnBottomSheet', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /** Original innerWidth, restored after tests that force the narrow breakpoint. */
  let originalWidth: number;

  function container(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.mn-sheet-container');
  }

  function backdrop(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.mn-sheet-backdrop');
  }

  function grabber(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.cursor-grab');
  }

  /** Forces the viewport to the narrow width the swipe gesture requires to arm. */
  function forceNarrow(): void {
    Object.defineProperty(window, 'innerWidth', {value: 375, configurable: true});
  }

  beforeEach(async () => {
    originalWidth = window.innerWidth;
    await TestBed.configureTestingModule({imports: [HostComponent]}).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {value: originalWidth, configurable: true});
  });

  it('renders the container, backdrop, grabber and projected body by default', () => {
    expect(container()).not.toBeNull();
    expect(backdrop()).not.toBeNull();
    expect(grabber()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.projected-body')).not.toBeNull();
  });

  it('hides the backdrop when showBackdrop is false', () => {
    host.showBackdrop = false;
    fixture.detectChanges();
    expect(backdrop()).toBeNull();
  });

  it('hides the grabber when showGrabber is false', () => {
    host.showGrabber = false;
    fixture.detectChanges();
    expect(grabber()).toBeNull();
  });

  it('applies the min-height floor and max-height cap to the container', () => {
    host.minHeightPx = 240;
    host.maxHeightVh = 92;
    fixture.detectChanges();
    expect(container()!.style.minHeight).toBe('240px');
    expect(container()!.style.maxHeight).toBe('92vh');
  });

  it('passes containerClass through to the sheet container', () => {
    host.containerClass = 'modal-container';
    fixture.detectChanges();
    expect(container()!.classList.contains('modal-container')).toBeTrue();
  });

  it('follows the finger while dragging and snaps back on a short, slow drag', () => {
    forceNarrow();
    const sheet = host.sheet;

    sheet.onSheetPointerDown(ptr(500, 0));
    expect(sheet.isDraggingSheet).toBeTrue();

    sheet.onSheetPointerMove(ptr(560, 200)); // 60px, well under the 150px threshold
    expect(sheet.sheetDragY).toBe(60);

    sheet.onSheetPointerUp();
    expect(sheet.isDraggingSheet).toBeFalse();
    expect(sheet.sheetDragY).toBe(0); // snapped back
    expect(sheet.isDismissing).toBeFalse();
    expect(host.dismissed).toBe(0);
  });

  it('dismisses on a drag past the distance threshold', fakeAsync(() => {
    forceNarrow();
    const sheet = host.sheet;

    sheet.onSheetPointerDown(ptr(500, 0));
    sheet.onSheetPointerMove(ptr(700, 400)); // 200px > 150px threshold
    sheet.onSheetPointerUp();

    expect(sheet.isDismissing).toBeTrue();
    tick(700); // drain the exit fallback timer
    expect(host.dismissed).toBe(1);
  }));

  it('dismisses on a fast downward flick even below the distance threshold', fakeAsync(() => {
    forceNarrow();
    const sheet = host.sheet;

    sheet.onSheetPointerDown(ptr(500, 0));
    // 40px over 20ms => 2 px/ms, far above the 0.5 px/ms flick threshold, and past the
    // 32px minimum flick distance.
    sheet.onSheetPointerMove(ptr(520, 10));
    sheet.onSheetPointerMove(ptr(540, 20));
    sheet.onSheetPointerUp();

    expect(sheet.isDismissing).toBeTrue();
    tick(700);
    expect(host.dismissed).toBe(1);
  }));

  it('dismisses on a backdrop tap', fakeAsync(() => {
    host.sheet.onBackdropClick();
    expect(host.sheet.isDismissing).toBeTrue();
    tick(700);
    expect(host.dismissed).toBe(1);
  }));

  it('ignores gestures and backdrop taps when not dismissible', () => {
    forceNarrow();
    host.dismissible = false;
    fixture.detectChanges();

    host.sheet.onSheetPointerDown(ptr(500, 0));
    expect(host.sheet.isDraggingSheet).toBeFalse();

    host.sheet.onBackdropClick();
    expect(host.sheet.isDismissing).toBeFalse();
    expect(host.dismissed).toBe(0);
  });

  it('startClosing resolves after playing the exit', fakeAsync(() => {
    let resolved = false;
    host.sheet.startClosing().then(() => (resolved = true));
    expect(host.sheet.isDismissing).toBeTrue();
    tick(700);
    expect(resolved).toBeTrue();
  }));
});
