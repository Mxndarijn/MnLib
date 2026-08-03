import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MnInputField, MnInputProps} from 'mn-angular-lib';
import {DEMOS, DemoGroup, groupDemos} from '../shared/demo-catalog';

@Component({
  selector: 'app-demo-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MnInputField],
  templateUrl: './demo-list.component.html',
  styles: [
    `
      :host {
        display: block;
      }

      .home-hero {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
        margin-bottom: 40px;
      }

      .home-search {
        width: 280px;
        max-width: 100%;
      }

      .home-empty {
        padding: 36px 0;
        font-size: 14px;
        opacity: 0.5;
      }

      .home-eyebrow {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--color-primary);
        margin: 0 0 10px;
      }

      .home-title {
        font-size: clamp(28px, 4vw, 36px);
        font-weight: 700;
        letter-spacing: -0.025em;
        line-height: 1.05;
        margin: 0;
        color: var(--color-base-content);
      }

      .home-lead {
        margin: 14px 0 0;
        font-size: 15px;
        line-height: 1.6;
        opacity: 0.6;
        max-width: 58ch;
      }

      .home-lead .num {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-weight: 600;
        opacity: 0.85;
      }

      /* Category section */
      .home-group + .home-group {
        margin-top: 34px;
      }

      .home-group-head {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 14px;
      }

      .home-group-name {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin: 0;
        color: var(--color-base-content);
      }

      .home-group-count {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
        opacity: 0.4;
      }

      /* Cards */
      .home-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(224px, 1fr));
        gap: 14px;
      }

      .home-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 18px;
        background: var(--color-base-200);
        border: 1px solid var(--color-base-300);
        border-radius: 12px;
        text-decoration: none;
        color: inherit;
        transition: border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
      }

      .home-card:hover {
        border-color: var(--color-primary);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
      }

      .home-card:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }

      .home-avatar {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        color: #fff;
        letter-spacing: 0.03em;
        flex-shrink: 0;
      }

      .home-card-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--color-base-content);
      }

      .home-card-desc {
        font-size: 12px;
        line-height: 1.5;
        opacity: 0.6;
      }

      @media (prefers-reduced-motion: reduce) {
        .home-card {
          transition: none;
        }
        .home-card:hover {
          transform: none;
        }
      }
    `,
  ],
})
export class DemoListComponent {
  readonly total = DEMOS.length;

  searchControl = new FormControl('');

  searchProps: MnInputProps = {
    id: 'home-search',
    type: 'search',
    placeholder: 'Search components…',
    hover: false,
  };

  /** Cards matching the current search, grouped into shelves. */
  get groups(): DemoGroup[] {
    const q = (this.searchControl.value ?? '').toLowerCase().trim();
    const matches = q
      ? DEMOS.filter(
        (d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
      )
      : DEMOS;
    return groupDemos(matches);
  }
}
