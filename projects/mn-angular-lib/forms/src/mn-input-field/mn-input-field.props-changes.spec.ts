import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { MnConfigService, MnLanguageService } from 'mn-angular-lib/core';
import { MnInputField } from './mn-input-field';
import { MnInputProps } from './mn-input-fieldTypes';

/** Minimal language stub. */
class LanguageStub {
  readonly locale$ = new BehaviorSubject('en');
  translateIfPresent(): string | undefined {
    return undefined;
  }
}

/** Minimal config stub: resolve returns an empty UI config. */
class ConfigStub {
  resolve(): Record<string, unknown> {
    return {};
  }
}

@Component({
  standalone: true,
  imports: [MnInputField, ReactiveFormsModule],
  template: `<mn-lib-input-field [formControl]="control" [props]="props"></mn-lib-input-field>`,
})
class HostComponent {
  readonly control = new FormControl('');
  props: MnInputProps = {
    id: 'search',
    type: 'text',
    label: 'Search',
  };
}

/**
 * Regression: parents often swap `props` (new label after a language switch)
 * without recreating the field. Without ngOnChanges the label stayed stale.
 */
describe('MnInputField props changes', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MnLanguageService, useClass: LanguageStub },
        { provide: MnConfigService, useClass: ConfigStub },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('updates the label when props is replaced', () => {
    expect(fixture.nativeElement.textContent).toContain('Search');

    fixture.componentInstance.props = {
      id: 'search',
      type: 'text',
      label: 'Zoeken',
    };
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Zoeken');
    expect(fixture.nativeElement.textContent).not.toContain('Search');
  });
});
