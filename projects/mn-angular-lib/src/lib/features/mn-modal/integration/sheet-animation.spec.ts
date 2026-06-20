import {ApplicationRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ModalBuilder} from '../builder';
import {MnModalService} from '../mn-modal.service';

/**
 * Regression coverage for the modal open/close animations.
 *
 * Mounts through the REAL MnModalService flow (createComponent + attachView +
 * appendChild) and inspects getAnimations() on .modal-container, which reports
 * whether an animation/transition is actually live.
 *
 * Two things this guards:
 *  - OPEN: an entry animation runs.
 *  - CLOSE: `.closing` lands without a full appRef.tick() (it was being applied
 *    via the host-class binding, which a bare detectChanges() on this dynamically-
 *    created root component does not flush — breaking close in zoneless apps), AND
 *    a close animation is actually running. On the mobile bottom sheet the close is
 *    a transform TRANSITION, not a keyframe: replaying the close keyframe on a sheet
 *    whose open keyframe already finished does not animate on mobile browsers.
 *
 * Default CI runs this at wide ChromeHeadless (centred modal). To exercise the
 * mobile bottom-sheet path specifically:
 *   npx ng test mn-angular-lib --watch=false --browsers=ChromeHeadlessNarrow \
 *     --include='**\/sheet-animation.spec.ts'
 */
describe('modal open/close animation (real mount)', () => {
  let service: MnModalService;
  let appRef: ApplicationRef;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MnModalService);
    appRef = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    document.querySelectorAll('mn-modal-shell').forEach(el => el.remove());
  });

  function host(): HTMLElement {
    return document.querySelector('mn-modal-shell') as HTMLElement;
  }

  function container(): HTMLElement {
    return document.querySelector('mn-modal-shell .modal-container') as HTMLElement;
  }

  function build() {
    return ModalBuilder.confirmation<boolean>().title('Hello').message('World').build();
  }

  function isMobileWidth(): boolean {
    return window.matchMedia('(max-width: 639.98px)').matches;
  }

  it('OPEN: container has a live entry animation right after mount', () => {
    service.open(build());
    appRef.tick(); // drives the first CD the zone would normally trigger

    const c = container();
    expect(c).withContext('container should render after tick').toBeTruthy();
    expect(c.getAnimations().length)
      .withContext('an entry animation should be live').toBeGreaterThan(0);
  });

  it('CLOSE: applies .closing without a full app tick', async () => {
    const ref = service.open(build());
    appRef.tick();

    // Dismiss the way a backdrop tap does. startClosing() defers via setTimeout(0)
    // then applies `.closing` directly. Deliberately do NOT call appRef.tick()
    // afterwards: the class drives the close animation and must land without a full
    // app tick, otherwise close is dead in zoneless apps. (A running close animation
    // is asserted by the settled-close test below, which is the realistic sequence.)
    ref.dismiss('backdrop' as never);
    await new Promise(r => setTimeout(r, 50));

    expect(container()).withContext('container should still exist during close').toBeTruthy();
    expect(host().classList.contains('closing'))
      .withContext('.closing must be applied without a full app tick').toBe(true);
  });

  it('CLOSE after the open settles still animates (the reported mobile bug)', async () => {
    const ref = service.open(build());
    appRef.tick();

    // Faithful sequence: open, let the entry animation FINISH, then tap to close.
    // This is what exposed the bug — the close keyframe would not replay on a
    // settled sheet, so the close is now a transform transition instead.
    await new Promise(r => setTimeout(r, 550));

    ref.dismiss('backdrop' as never);
    await new Promise(r => setTimeout(r, 50));

    const c = container();
    const running = c.getAnimations().filter(a => a.playState === 'running');
    expect(c).withContext('container should still exist during close').toBeTruthy();
    expect(running.length).withContext('a close animation must be running on a settled sheet')
      .toBeGreaterThan(0);

    if (isMobileWidth()) {
      // The fix: the mobile-sheet close runs as a transform TRANSITION.
      const hasTransform = running.some(a => (a as CSSTransition).transitionProperty === 'transform');
      expect(hasTransform).withContext('mobile close should glide via a transform transition').toBe(true);
    }
  });
});
