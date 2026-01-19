import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemoPageComponent } from '../shared/demo-page.component';
import {MnAlertService, MnAlertOutletComponent, provideMnAlerts, MnAlertKind, MnButton} from 'mn-angular-lib';

@Component({
  selector: 'app-alerts-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    provideMnAlerts({
      durations: { success: 2500, info: 3500, warning: 6000, error: 8000, default: 4000 },
      cssClasses: {
        success: 'mn-alert-success',
        info: 'mn-alert-info',
        warning: 'mn-alert-warning',
        error: 'mn-alert-error',
        default: 'alert'
      }
    })
  ],
  templateUrl: './alerts-demo.component.html',
  styles: [
    `
    .controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .mn-btn { cursor: pointer; background: var(--mn-primary); color: #fff; border: 1px solid var(--mn-primary); border-radius: var(--mn-radius); padding: var(--mn-padding); }
    .outline { background: transparent; color: var(--mn-primary); }

    .field { display: flex; flex-direction: column; gap: 4px; }
    .inputs { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin-bottom: 12px; }
    input[type="text"], input[type="number"] { padding: 6px 8px; border-radius: var(--mn-radius); border: 1px solid #e5e7eb; }

    /* Example basic styling for alerts in the outlet */
    .demo-alert { display: flex; align-items: start; gap: 8px; padding: 10px 12px; border-radius: var(--mn-radius); border: 1px solid #e5e7eb; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
    .demo-alert .title { font-weight: 600; margin-right: 6px; }
    .demo-alert .subtitle { color: #555; }
    .demo-alert .spacer { flex: 1; }
    .demo-alert .close { border: none; background: transparent; cursor: pointer; color: #666; }

    /* Kinds demo colors (purely for the demo template) */
    .kind-success { border-color: #d1fae5; background: #ecfdf5; }
    .kind-info { border-color: #dbeafe; background: #eff6ff; }
    .kind-warning { border-color: #fef3c7; background: #fffbeb; }
    .kind-error { border-color: #fee2e2; background: #fef2f2; }
    `
  ]
})
export class AlertsDemoComponent {
  private alerts = inject(MnAlertService);

  // Interactive inputs
  titleInput = '';
  subTitleInput = '';
  durationInputMs: number | null = null;

  show(kind: Exclude<MnAlertKind, 'default'>) {
    const title = this.titleInput?.trim() || kind.toUpperCase();
    const sub = this.subTitleInput?.trim() || 'This is a demo alert triggered via MnAlertService.';

    // Build extra options from inputs
    const extra: { duration?: number } = {};
    const dur = this.durationInputMs;
    if (typeof dur === 'number' && !Number.isNaN(dur) && dur >= 0) {
      extra.duration = dur;
    }

    switch (kind) {
      case 'success': return this.alerts.success(title, sub, extra);
      case 'info': return this.alerts.info(title, sub, extra);
      case 'warning': return this.alerts.warning(title, sub, extra);
      case 'error': return this.alerts.error(title, sub, extra);
    }
  }

  showCustomDuration() {
    this.alerts.info('Custom duration (1s)', 'Overrides provider default with explicit value', { duration: 1000 });
  }

  showCustomClass() {
    this.alerts.warning('Custom class', 'Adds extra CSS class', { cssClass: 'ring-2' });
  }

  clearAll() { this.alerts.clear(); }
}
