import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusCarouselDemo } from './focus-carousel-demo';

describe('FocusCarouselDemo', () => {
  let component: FocusCarouselDemo;
  let fixture: ComponentFixture<FocusCarouselDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FocusCarouselDemo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FocusCarouselDemo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
