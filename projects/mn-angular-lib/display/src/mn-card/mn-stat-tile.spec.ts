import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MnStatTile } from './mn-stat-tile';

/** Host rendering one tile with an icon and a trailing badge. */
@Component({
  standalone: true,
  imports: [MnStatTile],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <mn-stat-tile [label]="label" [value]="value" [data]="{ color: 'success' }">
      <i id="icon"></i>
      <b trailing id="trailing">+2</b>
    </mn-stat-tile>
  `,
})
class HostComponent {
  label = 'Present';
  value: string | number = 12;
}

describe('MnStatTile', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /** The large number element. */
  const number = (): HTMLElement => fixture.nativeElement.querySelector('.tabular-nums');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the label and the number, with the number in tabular figures', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Present');
    expect(number().textContent?.trim()).toBe('12');
  });

  it('renders on the card shell as a row', () => {
    const card = fixture.nativeElement.querySelector('[mnCard]') as HTMLElement;
    expect(card.classList).toContain('border-base-300');
    expect(card.classList).toContain('flex-row');
  });

  it('projects the icon into a chip of the given colour and the trailing content next to the number', () => {
    const el: HTMLElement = fixture.nativeElement;
    const chip = el.querySelector('mn-icon-chip') as HTMLElement;
    expect(chip.classList).toContain('bg-success/10');
    expect(chip.querySelector('#icon')).not.toBeNull();
    expect(el.querySelector('#trailing')).not.toBeNull();
  });

  it('shares a row with its siblings as a growing tile', () => {
    const tile: HTMLElement = fixture.nativeElement.querySelector('mn-stat-tile');
    expect(tile.classList).toContain('flex-1');
  });

  it('re-renders a formatted value', () => {
    host.value = '€ 25,50';
    fixture.detectChanges();

    expect(number().textContent?.trim()).toBe('€ 25,50');
  });
});
