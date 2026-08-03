import {Component, Input} from '@angular/core';

/**
 * One example: a small label + optional hint, then the live component in open
 * space. Static and borderless — examples are grouped by space, not boxed or
 * collapsed. Drop live components inside as projected content.
 */
@Component({
  selector: 'app-demo-example',
  standalone: true,
  imports: [],
  templateUrl: './demo-example.component.html',
  styles: [
    `
      .specimen {
        display: block;
      }

      .specimen-title {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.01em;
        color: var(--color-base-content);
      }

      .specimen-hint {
        margin: 3px 0 0;
        font-size: 12.5px;
        line-height: 1.5;
        opacity: 0.55;
      }

      .specimen-stage {
        padding-top: 14px;
      }
    `,
  ],
})
export class DemoExampleComponent {
  @Input() title = '';
  /** Optional one-line explanation shown under the example title. */
  @Input() hint = '';
}
