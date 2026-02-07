import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputFieldDemo } from './input-field-demo';

describe('InputFieldDemo', () => {
  let component: InputFieldDemo;
  let fixture: ComponentFixture<InputFieldDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputFieldDemo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputFieldDemo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
