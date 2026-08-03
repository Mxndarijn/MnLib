import {Component, Input, inject} from '@angular/core';
import {Router} from '@angular/router';
import {DEMOS} from './demo-catalog';

/**
 * Consistent chrome for a component demo page: a header with a category eyebrow
 * (resolved from the route), the title, an inline monospace selector, and a
 * lead. The body lays projected examples out in an evenly-spaced column. Sits
 * inside the app shell's content area, so it adds no width of its own.
 */
@Component({
  selector: 'app-demo-page',
  standalone: true,
  imports: [],
  templateUrl: './demo-page.component.html',
  styles: [
    `
      .demo-page-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--color-base-300);
      }

      .demo-page-eyebrow {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        opacity: 0.45;
        margin: 0 0 10px;
      }

      .demo-page-titles {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
      }

      .demo-page-title {
        font-size: clamp(23px, 3vw, 29px);
        font-weight: 700;
        letter-spacing: -0.025em;
        line-height: 1.1;
        margin: 0;
        color: var(--color-base-content);
      }

      .demo-page-tag {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 13px;
        color: var(--color-primary);
      }

      .demo-page-lead {
        margin: 10px 0 0;
        font-size: 14px;
        line-height: 1.55;
        opacity: 0.6;
        max-width: 64ch;
      }

      .demo-page-actions {
        display: flex;
        align-items: center;
      }

      .demo-page-body {
        display: flex;
        flex-direction: column;
        gap: 30px;
      }
    `,
  ],
})
export class DemoPageComponent {
  @Input() title = '';
  /** Optional one-line summary shown under the title. */
  @Input() lead = '';
  /** Optional selector/identifier shown as inline monospace (e.g. `mn-button`). */
  @Input() tag = '';

  private readonly router = inject(Router);

  /** Category eyebrow, resolved from the current route via the catalog. */
  get eyebrow(): string {
    const url = this.router.url.split('?')[0];
    return DEMOS.find((d) => url.startsWith(d.path))?.category ?? '';
  }
}
