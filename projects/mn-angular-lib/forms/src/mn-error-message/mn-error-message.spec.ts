import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MnErrorMessage } from './mn-error-message';

describe('ErrorMessage', () => {
  let component: MnErrorMessage;
  let fixture: ComponentFixture<MnErrorMessage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnErrorMessage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MnErrorMessage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
