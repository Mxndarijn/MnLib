import {Routes} from '@angular/router';
import {DemoListComponent} from './demo-list/demo-list.component';
import {ButtonDemo} from './button-demo/button-demo';
import {AlertsDemoComponent} from './demos/alerts-demo.component';
import {ConfigDemoComponent} from './demos/config-demo.component';
import {DualHorizontalImageDemo} from './dual-horizontal-image-demo/dual-horizontal-image-demo';
import {InformationCardDemo} from './information-card-demo/information-card-demo';
import {InputFieldDemo} from './input-field-demo/input-field-demo';
import {TextareaDemo} from './textarea-demo/textarea-demo';
import {ModalDemo} from './modal-demo/modal-demo';
import {TableDemo} from './table-demo/table-demo';
import {LanguageDemo} from './language-demo/language-demo';
import {CalendarDemo} from './calendar-demo/calendar-demo';
import {ListDemo} from './list-demo/list-demo';
import {DatetimeDemo} from './datetime-demo/datetime-demo';
import {SelectDemo} from './select-demo/select-demo';
import {BadgeDemo} from './badge-demo/badge-demo';
import {IconDemo} from './icon-demo/icon-demo';
import {MultiSelectDemo} from './multi-select-demo/multi-select-demo';
import {TabDemo} from './tab-demo/tab-demo';
import {CheckboxDemo} from './checkbox-demo/checkbox-demo';
import {SkeletonDemo} from './skeleton-demo/skeleton-demo';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'demos', component: DemoListComponent, title: 'Demos' },
  { path: 'demos/alerts', component: AlertsDemoComponent, title: 'Alerts Demo' },
  { path: 'demos/button-demo', component: ButtonDemo, title: 'Button Demo' },
  { path: 'demos/config', component: ConfigDemoComponent, title: 'Config Demo' },
  { path: 'demos/dual-horizontal-image-demo', component: DualHorizontalImageDemo, title: 'DualImageHorizontal Demo' },
  { path: 'demos/information-card-demo', component: InformationCardDemo, title: 'Information card Demo' },
  {path: 'demos/input-field-demo', component: InputFieldDemo, title: 'Input Field Demo' },
  {path: 'demos/textarea-demo', component: TextareaDemo, title: 'Textarea Demo' },
  {path: 'demos/modal-demo', component: ModalDemo, title: 'Modal Demo' },
  {path: 'demos/table-demo', component: TableDemo, title: 'Table Demo' },
  {path: 'demos/language-demo', component: LanguageDemo, title: 'Language Demo' },
  {path: 'demos/calendar-demo', component: CalendarDemo, title: 'Calendar Demo' },
  {path: 'demos/list-demo', component: ListDemo, title: 'List Demo' },
  {path: 'demos/datetime-demo', component: DatetimeDemo, title: 'Datetime Demo'},
  {path: 'demos/select-demo', component: SelectDemo, title: 'Select Demo'},
  {path: 'demos/badge-demo', component: BadgeDemo, title: 'Badge Demo'},
  {path: 'demos/icon-demo', component: IconDemo, title: 'Icon Demo'},
  {path: 'demos/multi-select-demo', component: MultiSelectDemo, title: 'Multi-Select Demo'},
  {path: 'demos/tab-demo', component: TabDemo, title: 'Tab Demo'},
  {path: 'demos/checkbox-demo', component: CheckboxDemo, title: 'Checkbox Demo'},
  {path: 'demos/skeleton-demo', component: SkeletonDemo, title: 'Skeleton Demo'},
];
