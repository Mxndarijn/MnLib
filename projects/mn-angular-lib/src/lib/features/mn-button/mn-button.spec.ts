import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MnButton } from './mn-button';

describe('MnButton', () => {
  let component: MnButton;
  let fixture: ComponentFixture<MnButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnButton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MnButton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('applies BEM classes for color, variant and size', () => {
    component.color = 'success';
    component.variant = 'outlined';
    component.size = 'small';
    component.fullWidth = true;
    component.ngOnChanges?.();
    fixture.detectChanges();

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const className = btn.className;
    expect(className).toContain('mn-button');
    expect(className).toContain('mn-button--outlined');
    expect(className).toContain('mn-button--success');
    expect(className).toContain('mn-button--small');
    expect(className).toContain('mn-button--full-width');
  });

  it('reflects aria-disabled when disabled', () => {
    component.disabled = true;
    component.ngOnChanges?.();
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.disabled).toBeTrue();
  });

  it('sets aria-busy and disables when loading', () => {
    component.loading = true;
    component.ngOnChanges?.();
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.disabled).toBeTrue();
  });

  it('binds the native button type attribute', () => {
    component.type = 'submit';
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('type')).toBe('submit');
  });
});
