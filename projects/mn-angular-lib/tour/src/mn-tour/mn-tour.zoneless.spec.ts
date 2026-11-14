import { Component, inject, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MnTourRef, MnTourService } from './mn-tour.service';

/** Hosts a target whose position is a signal and starts a tour from a click, as an app does. */
@Component({
  standalone: true,
  template: `
    <button id="start" type="button" (click)="start()">start</button>
    <div data-tour="moving" [style.top.px]="top()" style="position: fixed; left: 40px; width: 80px; height: 30px"></div>
  `,
})
class HostComponent {
  private readonly tours = inject(MnTourService);
  readonly top = signal(120);
  ref: MnTourRef | null = null;

  /** Starts a one-step tour on the moving target. */
  start(): void {
    this.ref = this.tours.start({
      steps: [{ target: 'moving', title: 'Bewegend', body: 'Volgt het element' }],
      labels: {
        skip: 'Overslaan',
        previous: 'Vorige',
        next: 'Volgende',
        done: 'Klaar',
        close: 'Sluiten',
        startNext: 'Start volgende',
        stepLabel: (n, total) => `Stap ${n} van ${total}`,
      },
    });
  }
}

/**
 * The tour writes its state after awaits, timers and animation frames: a scroll re-places the
 * highlight from a requestAnimationFrame callback, with no event Angular wraps behind it. In a
 * zoneless app that only reaches the screen because the state is signals the overlay's template
 * reads. Nothing here calls `detectChanges()` after the act.
 */
describe('MnTourService (zoneless change detection)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let service: MnTourService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    service = TestBed.inject(MnTourService);
    spyOn(service, 'prefersReducedMotion').and.returnValue(true);
    spyOn(service, 'isCompactViewport').and.returnValue(false);
    fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    service.ngOnDestroy();
    fixture.destroy();
  });

  /** Waits until a condition holds, letting the scheduler, timers and frames run. */
  async function waitFor(condition: () => boolean): Promise<boolean> {
    for (let i = 0; i < 100; i++) {
      if (condition()) return true;
      await new Promise((r) => setTimeout(r, 20));
    }
    return condition();
  }

  const hole = (): HTMLElement | null => document.body.querySelector('.mn-tour-hole');

  it('follows its target after a scroll without anyone running change detection', async () => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#start')!.click();
    expect(await waitFor(() => !!document.body.querySelector('.mn-tour-card h2'))).toBeTrue();
    expect(await waitFor(() => parseFloat(hole()!.style.top) === 114)).toBeTrue();

    fixture.componentInstance.top.set(300);
    await fixture.whenStable();
    document.dispatchEvent(new Event('scroll'));

    expect(await waitFor(() => parseFloat(hole()!.style.top) === 294)).toBeTrue();
  });

  it('settles the outcome and removes the overlay after Klaar', async () => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#start')!.click();
    expect(await waitFor(() => !!document.body.querySelector('.mn-tour-primary'))).toBeTrue();
    document.body.querySelector<HTMLButtonElement>('.mn-tour-primary')!.click();
    expect(await fixture.componentInstance.ref!.result).toEqual({ status: 'completed', step: 0, startNext: false });
    expect(await waitFor(() => !document.body.querySelector('mn-tour-overlay'))).toBeTrue();
  });
});
