import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MnAngularLib } from './mn-angular-lib';

describe('MnAngularLib', () => {
  let component: MnAngularLib;
  let fixture: ComponentFixture<MnAngularLib>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnAngularLib]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MnAngularLib);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
