import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MnProportionBar } from './mn-proportion-bar';
import { MnProportionSegment } from './mn-proportion-barTypes';

/** Host that feeds the bar its segments, total and label. */
@Component({
  standalone: true,
  imports: [MnProportionBar],
  template: `<mn-proportion-bar [segments]="segments" [total]="total" ariaLabel="Turnout"></mn-proportion-bar>`,
})
class HostComponent {
  segments: MnProportionSegment[] = [
    { value: 6, color: 'success' },
    { value: 2, color: 'warning' },
  ];
  total: number | null = null;
}

describe('MnProportionBar', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /** The rendered runs, in draw order. */
  const runs = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[role="img"] > span'));

  /** The width style of a run as a number of percent. */
  const width = (run: HTMLElement): number => parseFloat(run.style.width);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sizes the runs against the segment sum when no total is given', () => {
    expect(runs().length).toBe(2);
    expect(width(runs()[0])).toBeCloseTo(75, 5);
    expect(width(runs()[1])).toBeCloseTo(25, 5);
    expect(runs()[0].classList).toContain('bg-success');
    expect(runs()[1].classList).toContain('bg-warning');
  });

  it('leaves the remainder of the track empty when a larger total is given', () => {
    host.total = 16;
    fixture.detectChanges();

    expect(width(runs()[0])).toBeCloseTo(37.5, 5);
    expect(width(runs()[1])).toBeCloseTo(12.5, 5);
  });

  it('skips zero-valued segments instead of drawing a hairline', () => {
    host.segments = [
      { value: 0, color: 'success' },
      { value: 3, color: 'gray' },
    ];
    fixture.detectChanges();

    expect(runs().length).toBe(1);
    expect(runs()[0].classList).toContain('bg-base-content/25');
    expect(width(runs()[0])).toBeCloseTo(100, 5);
  });

  it('maps danger onto the error colour', () => {
    host.segments = [{ value: 1, color: 'danger' }];
    fixture.detectChanges();

    expect(runs()[0].classList).toContain('bg-error');
  });

  it('draws nothing when everything is zero', () => {
    host.segments = [{ value: 0, color: 'success' }];
    fixture.detectChanges();

    expect(runs().length).toBe(0);
  });

  it('is one labelled image for assistive technology at the medium height by default', () => {
    const track: HTMLElement = fixture.nativeElement.querySelector('[role="img"]');
    expect(track.getAttribute('aria-label')).toBe('Turnout');
    expect(track.classList).toContain('h-2.5');
  });
});
