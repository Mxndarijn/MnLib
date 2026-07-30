import {ChangeDetectionStrategy, Component, inject, Input, TemplateRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Observable} from 'rxjs';
import {MnAlertStore} from '../mn-alert.store';
import {MnAlert} from '../mn-alert.types';
import {mnAlertVariants} from '../mn-alertVariants';
import {MnButton} from '../../mn-button/mn-button';
import {MnLanguageService} from '../../../language';

export type MnAlertTemplateContext = {
  $implicit: MnAlert;
  alert: MnAlert;
  dismiss: () => void;
}

@Component({
  selector: 'mn-alert-outlet',
  standalone: true,
  imports: [CommonModule, MnButton],
  templateUrl: './mn-alert-outlet.html',
  styleUrl: './mn-alert-outlet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnAlertOutletComponent {
  private readonly lang = inject(MnLanguageService);

  /**
   * Accessible name for this control. Resolved through the conventional
   * `mnAlert.close` key so an app can translate it, falling back to English when the
   * key is not defined rather than leaking the raw key into the UI.
   */
  get closeLabel(): string {
    return this.lang.translateIfPresent('mnAlert.close') ?? 'Close';
  }

  @Input() template?: TemplateRef<MnAlertTemplateContext>;

  private store = inject(MnAlertStore);
  alerts$: Observable<MnAlert[]> = this.store.alerts$;

  constructor() {}

  dismissAlert(id: string) {
    this.store.dismiss(id);
  }

  trackById = (_: number, a: MnAlert) => a.id;

  getAlertClasses(a: MnAlert) {
    return mnAlertVariants({ kind: a.kind, variant: a.variant });
  }

  contextFor(a: MnAlert) {
    return {
      $implicit: a,
      alert: a,
      dismiss: () => this.dismissAlert(a.id)
    } as const;
  }

}
