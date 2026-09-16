import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MnCard } from './mn-card';
import { MnCardTypes } from './mn-cardTypes';

/** Host rendering one card with a projected icon, header-end content and a body. */
@Component({
  standalone: true,
  imports: [MnCard],
  template: `
    <mn-card class="min-w-0 flex-1" [data]="data" [heading]="heading" [enterDelayMs]="delay">
      <i cardIcon id="icon"></i>
      <ng-container cardHeaderEnd>
        @if (showBadge) {
          <b id="badge">3</b>
        }
      </ng-container>
      <p id="body">Body</p>
    </mn-card>
    <a mnCard id="link" [data]="{ hover: 'lift' }">Go</a>
  `,
})
class HostComponent {
  data: Partial<MnCardTypes> = {};
  heading?: string;
  delay = 0;
  showBadge = true;
}

describe('MnCard', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /** The element card. */
  const card = (): HTMLElement => fixture.nativeElement.querySelector('mn-card');

  /** The card's class list as a plain array. */
  const classes = (): string[] => Array.from(card().classList);

  /** The header row, present only when a heading is set. */
  const header = (): HTMLElement | null => card().querySelector('h2')?.parentElement ?? null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('is a compact stacked surface with a soft hover by default, and no header', () => {
    expect(classes()).toContain('p-4');
    expect(classes()).toContain('gap-3');
    expect(classes()).toContain('flex-col');
    expect(classes()).toContain('rounded-2xl');
    expect(classes()).toContain('hover:shadow-md');
    expect(classes()).toContain('animate-rise');
    expect(header()).toBeNull();
    expect(card().querySelector('#body')).not.toBeNull();
  });

  it('keeps the consumer\'s own classes beside its own', () => {
    expect(classes()).toContain('min-w-0');
    expect(classes()).toContain('flex-1');
  });

  it('widens the gap with the padding so a section card never passes a gap', () => {
    host.data = { padding: 'md' };
    fixture.detectChanges();

    expect(classes()).toContain('p-5');
    expect(classes()).toContain('gap-4');
    expect(classes()).not.toContain('gap-3');
  });

  it('lays its children out on one line as a row', () => {
    host.data = { layout: 'row' };
    fixture.detectChanges();

    expect(classes()).toContain('flex-row');
    expect(classes()).toContain('items-center');
    expect(classes()).not.toContain('flex-col');
  });

  it('draws the accent bar in the card colour only when asked', () => {
    expect(card().querySelector('[aria-hidden="true"]')).toBeNull();

    host.data = { accent: true, color: 'danger' };
    fixture.detectChanges();

    const bar = card().querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.classList).toContain('bg-error');
  });

  it('renders the header row with the icon in a chip, the h2 and the header-end content', () => {
    host.heading = 'Agenda';
    host.data = { color: 'warning' };
    fixture.detectChanges();

    const row = header() as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.querySelector('h2')?.textContent?.trim()).toBe('Agenda');
    const chip = row.querySelector('mn-icon-chip') as HTMLElement;
    expect(chip.classList).toContain('bg-warning/10');
    expect(chip.querySelector('#icon')).not.toBeNull();
    expect(row.querySelector('#badge')).not.toBeNull();
    expect(row.querySelector('#body')).toBeNull();
  });

  it('keeps the header row when the header-end content is conditionally absent', () => {
    host.heading = 'Agenda';
    host.showBadge = false;
    fixture.detectChanges();

    expect(header()).not.toBeNull();
    expect(card().querySelector('#badge')).toBeNull();
  });

  it('staggers the entrance through the animation delay', () => {
    host.delay = 120;
    fixture.detectChanges();

    expect(card().style.animationDelay).toBe('120ms');
  });

  it('works as an attribute on a native element, lifting on hover when told to', () => {
    const link = fixture.nativeElement.querySelector('#link') as HTMLElement;
    expect(link.classList).toContain('border-base-300');
    expect(link.classList).toContain('hover:-translate-y-1');
    expect(link.classList).not.toContain('hover:shadow-md');
  });
});
