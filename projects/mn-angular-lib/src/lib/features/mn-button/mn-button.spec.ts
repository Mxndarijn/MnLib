import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {MnButton} from './mn-button';
import {MnButtonTypes} from './mn-buttonTypes';

/** Minimal host that renders an `mnButton` so the attribute-selector component can be tested. */
@Component({
  standalone: true,
  imports: [MnButton],
  template: `<button mnButton [data]="data">Label</button>`,
})
class HostComponent {
  data: Partial<MnButtonTypes> = {};
}

describe('MnButton', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /** Returns the rendered `<button>` element. */
  const button = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button');

  /** Returns the injected spinner element, if present. */
  const spinner = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('button > span[aria-hidden="true"]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders no spinner and stays interactive by default', () => {
    expect(spinner()).toBeNull();
    expect(button().getAttribute('disabled')).toBeNull();
    expect(button().getAttribute('aria-busy')).toBeNull();
  });

  it('shows a spinner and blocks interaction while loading', () => {
    host.data = {loading: true};
    fixture.detectChanges();

    expect(spinner()).not.toBeNull();
    expect(button().hasAttribute('disabled')).toBe(true);
    expect(button().getAttribute('tabindex')).toBe('-1');
    expect(button().getAttribute('aria-busy')).toBe('true');
  });

  it('blocks interaction when disabled without marking it busy', () => {
    host.data = {disabled: true};
    fixture.detectChanges();

    expect(spinner()).toBeNull();
    expect(button().hasAttribute('disabled')).toBe(true);
    expect(button().getAttribute('aria-busy')).toBeNull();
    expect(button().getAttribute('aria-disabled')).toBe('true');
  });

  it('removes the spinner and unblocks when loading clears', () => {
    host.data = {loading: true};
    fixture.detectChanges();
    host.data = {loading: false};
    fixture.detectChanges();

    expect(spinner()).toBeNull();
    expect(button().getAttribute('disabled')).toBeNull();
    expect(button().getAttribute('aria-busy')).toBeNull();
  });
});
