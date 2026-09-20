import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MnBadge } from './mn-badge';
import { MnBadgeTypes } from './mn-badgeTypes';

/** Minimal host that renders an `mnBadge` so the attribute-selector component can be tested. */
@Component({
  standalone: true,
  imports: [MnBadge],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<span mnBadge [data]="data">Label</span>`,
})
class HostComponent {
  data: Partial<MnBadgeTypes> = {};
}

describe('MnBadge', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /** Returns the rendered badge element. */
  const badge = (): HTMLSpanElement => fixture.nativeElement.querySelector('span[mnBadge]');

  /** Returns the badge's class list as a plain array. */
  const classes = (): string[] => Array.from(badge().classList);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('defaults to the tinted primary badge at medium size', () => {
    expect(classes()).toContain('bg-primary/10');
    expect(classes()).toContain('border-primary/40');
    expect(classes()).toContain('text-(--color-primary-text,var(--color-primary))');
    expect(classes()).toContain('text-sm');
    expect(classes()).toContain('whitespace-nowrap');
  });

  it('tints a semantic colour at 10% and reads its text from the consumer text token with a fallback', () => {
    host.data = { color: 'warning' };
    fixture.detectChanges();

    expect(classes()).toContain('bg-warning/10');
    expect(classes()).toContain('border-warning/40');
    expect(classes()).toContain('text-(--color-warning-text,var(--color-warning))');
    expect(classes()).not.toContain('text-warning');
  });

  it('maps danger onto the error colour', () => {
    host.data = { color: 'danger' };
    fixture.detectChanges();

    expect(classes()).toContain('bg-error/10');
    expect(classes()).toContain('text-(--color-error-text,var(--color-error))');
  });

  it('keeps the solid fill variant on the base colour with its content colour', () => {
    host.data = { color: 'success', variant: 'fill' };
    fixture.detectChanges();

    expect(classes()).toContain('bg-success');
    expect(classes()).toContain('text-success-content');
    expect(classes()).not.toContain('bg-success/10');
  });

  it('leaves the neutral lightgray badge on the base-content tint', () => {
    host.data = { color: 'lightgray' };
    fixture.detectChanges();

    expect(classes()).toContain('bg-base-content/10');
    expect(classes()).toContain('text-base-content/70');
  });

  it('applies size and wrap options', () => {
    host.data = { size: 'lg', wrap: true };
    fixture.detectChanges();

    expect(classes()).toContain('text-base');
    expect(classes()).toContain('whitespace-normal');
  });
});
