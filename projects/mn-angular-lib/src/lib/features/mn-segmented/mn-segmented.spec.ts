import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LucideCalendarDays, LucideList } from '@lucide/angular';

import { MnSegmented } from './mn-segmented';
import { MnSegmentedDataSource } from './mn-segmentedTypes';

/** Minimal host so the controlled value can be driven and observed. */
@Component({
  standalone: true,
  imports: [MnSegmented],
  template: `<mn-segmented
    [dataSource]="dataSource"
    [justified]="justified"
    [value]="value"
    (valueChange)="onChange($event)"
  ></mn-segmented>`,
})
class HostComponent {
  dataSource: MnSegmentedDataSource = {
    ariaLabel: 'View',
    items: [
      { value: 'list', label: 'List', icon: LucideList.icon },
      { value: 'calendar', label: 'Calendar', icon: LucideCalendarDays.icon },
    ],
  };
  value?: string = 'list';
  justified = false;
  emitted: string[] = [];

  onChange(value: string): void {
    this.emitted.push(value);
  }
}

describe('MnSegmented', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const group = (): HTMLElement => fixture.nativeElement.querySelector('[role="group"]');
  const segments = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button'));
  const pressed = (): HTMLButtonElement[] =>
    segments().filter((segment) => segment.getAttribute('aria-pressed') === 'true');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders one segment per item, named by its label', () => {
    expect(segments().length).toBe(2);
    expect(segments()[0].textContent?.trim()).toBe('List');
    expect(segments()[1].textContent?.trim()).toBe('Calendar');
  });

  it('marks only the segment named by `value` as pressed', () => {
    expect(pressed().length).toBe(1);
    expect(pressed()[0].textContent?.trim()).toBe('List');
  });

  it('emits the clicked value without selecting it itself', () => {
    segments()[1].click();
    fixture.detectChanges();

    expect(host.emitted).toEqual(['calendar']);
    // The control is controlled: until the host feeds the new value back, the
    // previous segment stays pressed.
    expect(pressed()[0].textContent?.trim()).toBe('List');
  });

  it('follows the value the host feeds back', () => {
    host.value = 'calendar';
    fixture.detectChanges();

    expect(pressed().length).toBe(1);
    expect(pressed()[0].textContent?.trim()).toBe('Calendar');
  });

  it('stays silent when the active segment is clicked again', () => {
    segments()[0].click();
    fixture.detectChanges();

    expect(host.emitted).toEqual([]);
  });

  it('leaves nothing pressed when the value names no segment', () => {
    host.value = undefined;
    fixture.detectChanges();

    expect(pressed().length).toBe(0);
  });

  it('disables a segment and ignores its clicks', () => {
    host.dataSource = {
      items: [
        { value: 'list', label: 'List' },
        { value: 'calendar', label: 'Calendar', disabled: true },
      ],
    };
    fixture.detectChanges();

    expect(segments()[1].disabled).toBeTrue();
    segments()[1].click();
    fixture.detectChanges();
    expect(host.emitted).toEqual([]);
  });

  it('names the group from the data source', () => {
    expect(group().getAttribute('aria-label')).toBe('View');
  });

  it('names an icon-only segment from its ariaLabel, and leaves a labelled one to its label', () => {
    host.dataSource = {
      items: [
        { value: 'list', icon: LucideList.icon, ariaLabel: 'List view' },
        { value: 'calendar', label: 'Calendar', ariaLabel: 'ignored' },
      ],
    };
    fixture.detectChanges();

    expect(segments()[0].getAttribute('aria-label')).toBe('List view');
    expect(segments()[1].getAttribute('aria-label')).toBeNull();
  });

  it('rounds the track and nests the segments one step tighter', () => {
    // Default: an 8px track holding 6px segments.
    expect(group().className).toContain('rounded-lg');
    expect(segments()[0].className).toContain('rounded-md');

    host.dataSource = {...host.dataSource, borderRadius: 'full'};
    fixture.detectChanges();

    // A pill shares its rounding with its segments — there is no tighter step.
    expect(group().className).toContain('rounded-full');
    expect(segments()[0].className).toContain('rounded-full');
  });

  it('stretches the segments only when justified', () => {
    expect(segments()[0].className).not.toContain('flex-1');

    host.justified = true;
    fixture.detectChanges();

    expect(segments()[0].className).toContain('flex-1');
    expect(group().className).toContain('w-full');
  });
});
