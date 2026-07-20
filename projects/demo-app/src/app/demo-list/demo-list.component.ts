import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MnInputField, MnInputProps} from 'mn-angular-lib';

type DemoItem = {
  title: string;
  path: string;
  description?: string;
  abbr: string;
  color: string;
}

@Component({
  selector: 'app-demo-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MnInputField],
  templateUrl: './demo-list.component.html',
  styles: [`
    .list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
    .demo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .demo-card { display: flex; flex-direction: column; gap: 10px; padding: 20px; background: var(--color-base-200); border: 1px solid var(--color-base-300); border-radius: var(--mn-radius); text-decoration: none; color: inherit; transition: background 0.18s, border-color 0.18s, transform 0.15s, box-shadow 0.15s; cursor: pointer; }
    .demo-card:hover { background: var(--color-base-300); border-color: var(--color-primary); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    .card-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; letter-spacing: 0.03em; flex-shrink: 0; }
    .card-title { font-weight: 600; font-size: 15px; color: var(--color-base-content); }
    .card-desc { color: var(--color-base-content); opacity: 0.6; font-size: 12px; line-height: 1.5; flex: 1; }
    .no-results { grid-column: 1 / -1; text-align: center; padding: 48px; opacity: 0.4; font-size: 14px; }
  `]
})
export class DemoListComponent {
  searchControl = new FormControl('');

  searchProps: MnInputProps = {
    id: 'demo-search',
    type: 'search',
    placeholder: 'Search demos...',
    hover: false,
  };

  get filteredDemos(): DemoItem[] {
    const q = (this.searchControl.value ?? '').toLowerCase().trim();
    const items = !q ? this.demos : this.demos.filter(d =>
      d.title.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)
    );
    return [...items].sort((a, b) => a.title.localeCompare(b.title));
  }

  demos: DemoItem[] = [
    { title: 'Alerts',              path: '/demos/alerts',                    abbr: 'AL', color: '#ef4444', description: 'Alert service, providers, and outlet template.' },
    { title: 'Button',              path: '/demos/button-demo',               abbr: 'BT', color: '#3b82f6', description: 'Buttons with sizes, variants, and colors.' },
    { title: 'Checkbox',            path: '/demos/checkbox-demo',             abbr: 'CB', color: '#22c55e', description: 'Checkbox with standalone, forms, sizes, and disabled state.' },
    { title: 'Config',              path: '/demos/config',                    abbr: 'CF', color: '#6366f1', description: 'Section scoping, component defaults, and instance overrides.' },
    { title: 'Date Selector Bar',   path: '/demos/date-selector-bar-demo',    abbr: 'DS', color: '#e11d48', description: 'Day strip with Today, window arrows, and a date picker across locales and widths.' },
    { title: 'Dual Horizontal Image', path: '/demos/dual-horizontal-image-demo', abbr: 'DI', color: '#8b5cf6', description: 'Two images shown side by side.' },
    {
      title: 'File Input',
      path: '/demos/file-input-demo',
      abbr: 'FI',
      color: '#d97706',
      description: 'Dropzone, thumbnail, list, and compact modes with accept/size/count limits.'
    },
    { title: 'Information Card',    path: '/demos/information-card-demo',     abbr: 'IC', color: '#0ea5e9', description: 'Card with title, description and optional images.' },
    { title: 'Input Field',         path: '/demos/input-field-demo',          abbr: 'IF', color: '#0d9488', description: 'Text inputs with masking, validation, and error display.' },
    { title: 'Textarea',            path: '/demos/textarea-demo',             abbr: 'TX', color: '#059669', description: 'Configurable rows, cols, resize, and error handling.' },
    { title: 'Modal',               path: '/demos/modal-demo',                abbr: 'MO', color: '#475569', description: 'Wizard, form, confirmation, and custom modal variants.' },
    { title: 'Table',               path: '/demos/table-demo',                abbr: 'TB', color: '#0284c7', description: 'Sorting, selection, row actions, search, and pagination.' },
    { title: 'Language',            path: '/demos/language-demo',             abbr: 'LG', color: '#a21caf', description: 'Locale switching, translate pipe, interpolation, and config.' },
    { title: 'Calendar',            path: '/demos/calendar-demo',             abbr: 'CA', color: '#0891b2', description: 'Week, day, and month views with pluggable event renderers.' },
    { title: 'List',                path: '/demos/list-demo',                 abbr: 'LI', color: '#16a34a', description: 'Search, selection, load more, pagination, and custom templates.' },
    {
      title: 'Grid',
      path: '/demos/grid-demo',
      abbr: 'GR',
      color: '#2563eb',
      description: 'Responsive card grid with cols/auto-fit layout, skeleton, preview cap, and search.'
    },
    { title: 'Datetime',            path: '/demos/datetime-demo',             abbr: 'DT', color: '#dc2626', description: 'Date, time, and datetime-local modes with validation.' },
    { title: 'Select',              path: '/demos/select-demo',               abbr: 'SL', color: '#7c3aed', description: 'Native select with ControlValueAccessor, validation, and styling.' },
    { title: 'Badge',               path: '/demos/badge-demo',                abbr: 'BG', color: '#db2777', description: 'Badge component with color variants using tailwind-variants.' },
    { title: 'Icon',                path: '/demos/icon-demo',                 abbr: 'IO', color: '#ea580c', description: 'Icon component with attribute shorthand, color variants, and sizes.' },
    { title: 'Multi-Select',        path: '/demos/multi-select-demo',         abbr: 'MS', color: '#65a30d', description: 'Searchable options, max selections, disabled options, and validation.' },
    { title: 'Tab',                 path: '/demos/tab-demo',                  abbr: 'TP', color: '#0f766e', description: 'Tab component with data source, active tab management, and callbacks.' },
    { title: 'Skeleton',            path: '/demos/skeleton-demo',             abbr: 'SK', color: '#94a3b8', description: 'Generic loading placeholders — compose shapes to match any component layout.' },
  ];
}
