import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MnInformationCard } from './mn-information-card';
import {MnInformationCardData} from 'mn-angular-lib';

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
    component.data = {
      id: 1,
      title: 'Test Title',
      description: 'Test Description'
    } as MnInformationCardData;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
