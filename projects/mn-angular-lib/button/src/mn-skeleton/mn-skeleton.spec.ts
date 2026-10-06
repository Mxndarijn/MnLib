import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MnSkeleton } from './mn-skeleton';
import { MnSkeletonProps } from './mn-skeletonTypes';

/** Host rendering one skeleton with configurable props. */
@Component({
  standalone: true,
  imports: [MnSkeleton],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<mn-skeleton [data]="data"></mn-skeleton>`,
})
class HostComponent {
  data: Partial<MnSkeletonProps> = {};
}

describe('MnSkeleton', () => {
  let fixture: ComponentFixture<HostComponent>;

  /** The rendered skeleton host element. */
  const skeleton = (): HTMLElement => fixture.nativeElement.querySelector('mn-skeleton');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('is hidden from assistive tech', () => {
    expect(skeleton().getAttribute('aria-hidden')).toBe('true');
  });

  it('waits 300 ms before fading in, so a fast load never shows it', () => {
    const style = getComputedStyle(skeleton());
    // Angular scopes a component's keyframe names, so the name carries a per-component prefix.
    expect(style.animationName).toContain('mn-skeleton-appear');
    expect(style.animationDelay).toBe('0.3s');
    expect(style.animationDuration).toBe('0.15s');
    // `both`: invisible during the delay instead of flashing at full strength first.
    expect(style.animationFillMode).toBe('both');
  });

  it("takes a caller's appearDelay instead", () => {
    fixture.componentInstance.data = { appearDelay: 0 };
    fixture.detectChanges();
    expect(getComputedStyle(skeleton()).animationDelay).toBe('0s');

    fixture.componentInstance.data = { appearDelay: 800 };
    fixture.detectChanges();
    expect(getComputedStyle(skeleton()).animationDelay).toBe('0.8s');
  });

  it('keeps its size while it waits, so nothing below it moves', () => {
    fixture.componentInstance.data = { width: '120px', height: '16px' };
    fixture.detectChanges();
    const box = skeleton().getBoundingClientRect();
    expect(box.width).toBe(120);
    expect(box.height).toBe(16);
  });
});
