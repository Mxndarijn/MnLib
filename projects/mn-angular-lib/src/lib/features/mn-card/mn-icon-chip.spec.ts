import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MnIconChip } from './mn-icon-chip';
import { MnIconChipTypes } from './mn-icon-chipTypes';

/** Host that projects an icon into the chip. */
@Component({
  standalone: true,
  imports: [MnIconChip],
  template: `<mn-icon-chip [data]="data"><i id="icon"></i></mn-icon-chip>`,
})
class HostComponent {
  data: Partial<MnIconChipTypes> = {};
}

describe('MnIconChip', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /** The rendered chip element. */
  const chip = (): HTMLElement => fixture.nativeElement.querySelector('mn-icon-chip');

  /** The chip's class list as a plain array. */
  const classes = (): string[] => Array.from(chip().classList);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the medium primary chip by default with the icon inside', () => {
    expect(classes()).toContain('h-10');
    expect(classes()).toContain('w-10');
    expect(classes()).toContain('rounded-xl');
    expect(classes()).toContain('bg-primary/10');
    expect(classes()).toContain('text-(--color-primary-text,var(--color-primary))');
    expect(chip().querySelector('#icon')).not.toBeNull();
  });

  it('is decorative for assistive technology; the neighbouring title carries the meaning', () => {
    expect(chip().getAttribute('aria-hidden')).toBe('true');
  });

  it('switches colour and size together', () => {
    host.data = { color: 'warning', size: 'lg' };
    fixture.detectChanges();

    expect(classes()).toContain('h-12');
    expect(classes()).toContain('rounded-2xl');
    expect(classes()).toContain('bg-warning/10');
    expect(classes()).not.toContain('bg-primary/10');
  });

  it('maps danger onto the error colour and gray onto the base-content tint', () => {
    host.data = { color: 'danger' };
    fixture.detectChanges();
    expect(classes()).toContain('bg-error/10');

    host.data = { color: 'gray' };
    fixture.detectChanges();
    expect(classes()).toContain('bg-base-content/10');
    expect(classes()).toContain('text-base-content/70');
  });

  it('uses the small box for list rows', () => {
    host.data = { size: 'sm' };
    fixture.detectChanges();

    expect(classes()).toContain('h-9');
    expect(classes()).toContain('rounded-lg');
  });

  it('has an extra-small box for compact rows and an extra-large one for a hero icon', () => {
    host.data = { size: 'xs' };
    fixture.detectChanges();
    expect(classes()).toContain('h-8');
    expect(classes()).toContain('w-8');
    expect(classes()).toContain('rounded-lg');

    host.data = { size: 'xl' };
    fixture.detectChanges();
    expect(classes()).toContain('h-14');
    expect(classes()).toContain('w-14');
    expect(classes()).toContain('rounded-2xl');
    expect(classes()).not.toContain('h-8');
  });
});
