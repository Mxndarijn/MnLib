/**
 * The single source of truth for the demo catalog: every component demo, the
 * category it belongs to, and the accent colour used as its nav dot. Shared by
 * the sidebar navigation and the welcome page so they never drift apart.
 */

export type DemoCategory = 'Inputs' | 'Actions' | 'Data' | 'Navigation' | 'Feedback' | 'System';

export type DemoEntry = {
  title: string;
  path: string;
  category: DemoCategory;
  /** Accent colour shown as the nav dot and the home card avatar. */
  color: string;
  /** Two-letter initials shown on the home card avatar. */
  abbr: string;
  description: string;
};

export type DemoGroup = {
  category: DemoCategory;
  items: DemoEntry[];
};

/** Fixed shelf order for the sidebar and the welcome overview. */
export const DEMO_CATEGORY_ORDER: DemoCategory[] = [
  'Inputs',
  'Actions',
  'Data',
  'Navigation',
  'Feedback',
  'System',
];

export const DEMOS: DemoEntry[] = [
  // Inputs
  {title: 'Input Field', path: '/demos/input-field-demo', category: 'Inputs', color: '#0d9488', abbr: 'IF', description: 'Text inputs with masking, validation, and error display.'},
  {title: 'Textarea', path: '/demos/textarea-demo', category: 'Inputs', color: '#059669', abbr: 'TX', description: 'Configurable rows, cols, resize, and error handling.'},
  {title: 'Select', path: '/demos/select-demo', category: 'Inputs', color: '#7c3aed', abbr: 'SL', description: 'Native select with ControlValueAccessor and validation.'},
  {title: 'Multi-Select', path: '/demos/multi-select-demo', category: 'Inputs', color: '#65a30d', abbr: 'MS', description: 'Searchable options, max selections, and disabled options.'},
  {title: 'Checkbox', path: '/demos/checkbox-demo', category: 'Inputs', color: '#22c55e', abbr: 'CB', description: 'Standalone or forms-bound, with sizes and disabled state.'},
  {title: 'Datetime', path: '/demos/datetime-demo', category: 'Inputs', color: '#dc2626', abbr: 'DT', description: 'Date, time, and datetime-local modes with validation.'},
  {title: 'File Input', path: '/demos/file-input-demo', category: 'Inputs', color: '#d97706', abbr: 'FI', description: 'Dropzone, thumbnail, list, and compact modes with limits.'},
  {title: 'Rich Text Editor', path: '/demos/rich-text-editor-demo', category: 'Inputs', color: '#0891b2', abbr: 'RT', description: 'Quill-backed writing surface with a prose toolbar.'},

  // Actions
  {title: 'Button', path: '/demos/button-demo', category: 'Actions', color: '#3b82f6', abbr: 'BT', description: 'Buttons and links with sizes, variants, and colors.'},
  {title: 'Badge', path: '/demos/badge-demo', category: 'Actions', color: '#db2777', abbr: 'BG', description: 'Status badges with color variants and fills.'},
  {title: 'Icon', path: '/demos/icon-demo', category: 'Actions', color: '#ea580c', abbr: 'IO', description: 'Icons with attribute shorthand, color variants, and sizes.'},

  // Data
  {title: 'Table', path: '/demos/table-demo', category: 'Data', color: '#0284c7', abbr: 'TB', description: 'Sorting, selection, row actions, search, and pagination.'},
  {title: 'List', path: '/demos/list-demo', category: 'Data', color: '#16a34a', abbr: 'LI', description: 'Search, selection, load more, and custom templates.'},
  {title: 'Grid', path: '/demos/grid-demo', category: 'Data', color: '#2563eb', abbr: 'GR', description: 'Responsive card grid with skeletons, preview cap, and search.'},
  {title: 'Information Card', path: '/demos/information-card-demo', category: 'Data', color: '#0ea5e9', abbr: 'IC', description: 'Card with title, description, and optional images.'},
  {title: 'Dual Horizontal Image', path: '/demos/dual-horizontal-image-demo', category: 'Data', color: '#8b5cf6', abbr: 'DI', description: 'Two images shown side by side.'},

  // Navigation
  {title: 'Breadcrumbs', path: '/demos/breadcrumbs-demo', category: 'Navigation', color: '#f59e0b', abbr: 'BC', description: 'Linkable trail that degrades to a single Back control.'},
  {title: 'Tab', path: '/demos/tab-demo', category: 'Navigation', color: '#0f766e', abbr: 'TP', description: 'Tab bar with a data source, active state, and callbacks.'},
  {title: 'Date Selector Bar', path: '/demos/date-selector-bar-demo', category: 'Navigation', color: '#e11d48', abbr: 'DS', description: 'Day strip with Today, window arrows, and a date picker.'},
  {title: 'Calendar', path: '/demos/calendar-demo', category: 'Navigation', color: '#0891b2', abbr: 'CA', description: 'Week, day, and month views with pluggable event renderers.'},

  // Feedback
  {title: 'Alerts', path: '/demos/alerts', category: 'Feedback', color: '#ef4444', abbr: 'AL', description: 'Alert service, providers, and outlet template.'},
  {title: 'Modal', path: '/demos/modal-demo', category: 'Feedback', color: '#475569', abbr: 'MO', description: 'Wizard, form, confirmation, and custom modal variants.'},
  {title: 'Skeleton', path: '/demos/skeleton-demo', category: 'Feedback', color: '#94a3b8', abbr: 'SK', description: 'Loading placeholders you compose to match any layout.'},

  // System
  {title: 'Config', path: '/demos/config', category: 'System', color: '#6366f1', abbr: 'CF', description: 'Section scoping, component defaults, and instance overrides.'},
  {title: 'Language', path: '/demos/language-demo', category: 'System', color: '#a21caf', abbr: 'LG', description: 'Locale switching, translate pipe, interpolation, and config.'},
];

/** Groups the given entries into ordered shelves, dropping empty ones. */
export function groupDemos(entries: DemoEntry[]): DemoGroup[] {
  return DEMO_CATEGORY_ORDER.map((category) => ({
    category,
    items: entries
      .filter((entry) => entry.category === category)
      .sort((a, b) => a.title.localeCompare(b.title)),
  })).filter((group) => group.items.length > 0);
}
