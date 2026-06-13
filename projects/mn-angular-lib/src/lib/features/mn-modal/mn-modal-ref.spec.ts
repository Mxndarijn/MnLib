import {BaseModalConfig, MnModalRef, ModalCloseReason, ModalKind} from '.';
import {ComponentRef} from '@angular/core';

function createMockComponentRef() {
  return {
    instance: {
      config: {},
      modalRef: null,
      startClosing: jasmine.createSpy('startClosing').and.returnValue(Promise.resolve()),
    },
    changeDetectorRef: {
      detectChanges: jasmine.createSpy('detectChanges'),
    },
    destroy: jasmine.createSpy('destroy'),
  } as unknown as ComponentRef<unknown>;
}

describe('MnModalRef', () => {
  let ref: MnModalRef<string>;
  let mockComponentRef: ReturnType<typeof createMockComponentRef>;

  beforeEach(() => {
    mockComponentRef = createMockComponentRef();
    ref = new MnModalRef<string>(mockComponentRef, {kind: ModalKind.FORM} as BaseModalConfig<string>);
  });

  it('close() should emit COMPLETED with result', (done) => {
    ref.afterClosed$.subscribe((event) => {
      expect(event.reason).toBe(ModalCloseReason.COMPLETED);
      expect(event.result).toBe('hello');
      done();
    });
    ref.close('hello');
  });

  it('close() without result should emit COMPLETED with undefined result', (done) => {
    ref.afterClosed$.subscribe((event) => {
      expect(event.reason).toBe(ModalCloseReason.COMPLETED);
      expect(event.result).toBeUndefined();
      done();
    });
    ref.close();
  });

  it('dismiss() should emit the provided reason', (done) => {
    ref.afterClosed$.subscribe((event) => {
      expect(event.reason).toBe(ModalCloseReason.CANCELLED);
      expect(event.result).toBeUndefined();
      done();
    });
    ref.dismiss(ModalCloseReason.CANCELLED);
  });

  it('dismiss() with ESCAPE reason', (done) => {
    ref.afterClosed$.subscribe((event) => {
      expect(event.reason).toBe(ModalCloseReason.ESCAPE);
      done();
    });
    ref.dismiss(ModalCloseReason.ESCAPE);
  });

  it('dismiss() with BACKDROP reason', (done) => {
    ref.afterClosed$.subscribe((event) => {
      expect(event.reason).toBe(ModalCloseReason.BACKDROP);
      done();
    });
    ref.dismiss(ModalCloseReason.BACKDROP);
  });

  it('afterClosed$ should complete after close', (done) => {
    let _completed = false;
    ref.afterClosed$.subscribe({
      complete: () => {
        _completed = true;
        done();
      },
    });
    ref.close('result');
  });

  it('afterClosed$ should complete after dismiss', (done) => {
    ref.afterClosed$.subscribe({
      complete: () => done(),
    });
    ref.dismiss(ModalCloseReason.DISMISSED);
  });

  it('close() should call startClosing on the shell', async () => {
    ref.close('x');
    // Allow microtask to resolve
    await new Promise(resolve => setTimeout(resolve, 10));
    expect((mockComponentRef.instance as { startClosing: jasmine.Spy }).startClosing).toHaveBeenCalled();
  });

  it('close() should destroy the component ref', async () => {
    ref.close('x');
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockComponentRef.destroy).toHaveBeenCalled();
  });

  it('update() should trigger change detection', () => {
    ref.update({title: 'New Title'} as Partial<BaseModalConfig<string>>);
    expect(mockComponentRef.changeDetectorRef.detectChanges).toHaveBeenCalled();
  });

  it('no further emissions after close', (done) => {
    let emissionCount = 0;
    ref.afterClosed$.subscribe({
      next: () => emissionCount++,
      complete: () => {
        expect(emissionCount).toBe(1);
        done();
      },
    });
    ref.close('first');
  });
});
