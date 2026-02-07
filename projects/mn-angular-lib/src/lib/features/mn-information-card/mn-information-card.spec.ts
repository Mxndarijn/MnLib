import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MnInformationCard } from './mn-information-card';

describe('MnInformationCard', () => {
  let component: MnInformationCard;
  let fixture: ComponentFixture<MnInformationCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnInformationCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MnInformationCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
