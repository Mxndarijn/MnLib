import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {Subject} from 'rxjs';

import {MnSelect} from './mn-select';
import {MnSelectProps} from './mn-selectTypes';
import {MnConfigService} from 'mn-angular-lib/core';
import {MnLanguageService} from 'mn-angular-lib/core';

/**
 * Width of the anchored panel. It used to be pinned to the trigger's width, so a compact trigger
 * (the collection page-size picker) left the selected row no room for both its label and the
 * check mark: "50" rendered as a truncated "5". The panel now starts at the trigger's width and
 * grows to its widest row. Pinned to the anchored layout (`mobileSheet: false`).
 */

/** Host squeezing a full-width select into a trigger narrower than its selected row. */
@Component({
  standalone: true,
  imports: [MnSelect, FormsModule],
  template: `
    <div style="width: 56px">
      <mn-lib-select [props]="props" [(ngModel)]="value"></mn-lib-select>
    </div>`,
})
class HostComponent {
  props: MnSelectProps = {
    id: 'width-select',
    options: [5, 10, 25, 50].map(size => ({label: String(size), value: size})),
    searchable: false,
    mobileSheet: false,
    fullWidth: true,
    size: 'sm',
  };
  value: unknown = 50;
}

describe('MnSelect (panel width)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {provide: MnConfigService, useValue: {resolve: () => ({}) as never}},
        {
          provide: MnLanguageService,
          useValue: {
            locale$: new Subject<string>().asObservable(),
            translate: (key: string) => key,
            t: (key: string) => key,
            translateIfPresent: () => undefined,
          } as Partial<MnLanguageService>,
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    document.getElementById('width-select-listbox')?.remove();
    document.getElementById('width-select-shield')?.remove();
  });

  // Karma loads no Tailwind, so `w-max`/`truncate` do not lay out here; the inline styles the
  // component computes are the contract that can be pinned.
  it('floors the panel at the trigger width instead of pinning it there', async () => {
    const trigger: HTMLElement = fixture.nativeElement.querySelector('[role="combobox"]');
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const panel = document.getElementById('width-select-listbox') as HTMLElement;
    const triggerWidth = trigger.getBoundingClientRect().width;

    expect(panel.style.width).withContext('no fixed width').toBe('');
    expect(parseFloat(panel.style.minWidth)).toBe(triggerWidth);
    expect(parseFloat(panel.style.maxWidth)).toBeGreaterThanOrEqual(triggerWidth);
    expect(panel.classList).toContain('w-max');
  });
});
