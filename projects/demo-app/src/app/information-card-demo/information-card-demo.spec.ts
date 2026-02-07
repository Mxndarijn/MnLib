import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformationCardDemo } from './information-card-demo';

describe('InformationCardDemo', () => {
  let component: InformationCardDemo;
  let fixture: ComponentFixture<InformationCardDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformationCardDemo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InformationCardDemo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
