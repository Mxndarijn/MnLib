import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MnButton } from './mn-button';

describe('Button', () => {
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
});
