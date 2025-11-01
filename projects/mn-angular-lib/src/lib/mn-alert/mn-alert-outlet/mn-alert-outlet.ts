
import {Component, Input, TemplateRef, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import {MnAlertStore} from '../mn-alert.store';
import {MnAlert} from '../mn-alert.types';

export interface MnAlertTemplateContext {
  $implicit: MnAlert;
  alert: MnAlert;
  dismiss: () => void;
}

@Component({
  selector: 'mn-alert-outlet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mn-alert-outlet.html',
  styleUrl: './mn-alert-outlet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnAlertOutletComponent {
  @Input({ required: true }) template!: TemplateRef<MnAlertTemplateContext>;

  private store = inject(MnAlertStore);
  alerts$: Observable<MnAlert[]> = this.store.alerts$;

  constructor() {}

  dismissAlert(id: string) {
    this.store.dismiss(id);
  }

  trackById = (_: number, a: MnAlert) => a.id;

  contextFor(a: MnAlert) {
    return {
      $implicit: a,
      alert: a,
      dismiss: () => this.dismissAlert(a.id)
    } as const;
  }

}
