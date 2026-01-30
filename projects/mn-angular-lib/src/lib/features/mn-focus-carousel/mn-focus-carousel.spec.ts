import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MnFocusCarousel } from './mn-focus-carousel';

describe('MnFocusCarousel', () => {
  let component: MnFocusCarousel;
  let fixture: ComponentFixture<MnFocusCarousel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFocusCarousel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MnFocusCarousel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
