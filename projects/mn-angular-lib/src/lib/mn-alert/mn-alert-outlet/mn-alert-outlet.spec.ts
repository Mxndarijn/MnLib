import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MnAlertOutletComponent } from './mn-alert-outlet';
import { MnAlertStore } from '../mn-alert.store';

@Component({
  standalone: true,
  imports: [MnAlertOutletComponent],
  template: `
    <ng-template #tpl let-alert let-dismiss="dismiss">
      <div class="alert-item">
        <span class="title">{{ alert.title }}</span>
        <button class="dismiss" (click)="dismiss()">x</button>
      </div>
    </ng-template>

    <mn-alert-outlet [template]="tpl"></mn-alert-outlet>
  `
})
class HostComponent {
  @ViewChild('tpl', { static: true }) tpl!: TemplateRef<unknown>;
}

describe('MnAlertOutletComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let store: MnAlertStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [MnAlertStore]
    }).compileComponents();

    store = TestBed.inject(MnAlertStore);
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function queryAllAlerts() {
    return fixture.debugElement.queryAll(By.css('.alert-item'));
  }

  it('renders alerts from the store using the provided template context', () => {
    store.show({ title: 'A', kind: 'info'});
    store.show({ title: 'B', kind: 'success' });

    fixture.detectChanges();

    const items = queryAllAlerts();
    expect(items.length).toBe(2);
    const titles = items.map(el => el.nativeElement.querySelector('.title')!.textContent.trim());
    expect(titles).toEqual(['A', 'B']);
  });

  it('dismiss in context removes the alert', () => {
    const id1 = store.show({ title: 'A', kind: 'info' });
    store.show({ title: 'B', kind: 'success' });

    fixture.detectChanges();

    // Dismiss first one via button
    const firstDismissBtn = fixture.debugElement.queryAll(By.css('.dismiss'))[0];
    firstDismissBtn.triggerEventHandler('click', {});

    fixture.detectChanges();

    const items = queryAllAlerts();
    const titles = items.map(el => el.nativeElement.querySelector('.title')!.textContent.trim());
    expect(titles).toEqual(['B']);
  });
});
