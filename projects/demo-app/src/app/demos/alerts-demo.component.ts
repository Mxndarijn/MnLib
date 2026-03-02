import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemoPageComponent } from '../shared/demo-page.component';
import {MnAlertService, MnAlertOutletComponent, provideMnAlerts, MnAlertKind, MnButton} from 'mn-angular-lib';

@Component({
  selector: 'app-alerts-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, DemoPageComponent, MnAlertOutletComponent, MnButton],
  providers: [
    provideMnAlerts({
      durations: { success: 2500, info: 3500, warning: 6000, error: 8000, default: 4000 }
    })
  ],
  templateUrl: './alerts-demo.component.html',
  styles: [
    `
    .controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .inputs { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin-bottom: 12px; }
    input[type="text"], input[type="number"] { padding: 6px 8px; border-radius: var(--mn-radius); border: 1px solid #e5e7eb; }
    `
  ]
})
export class AlertsDemoComponent {
  public alerts = inject(MnAlertService);

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
