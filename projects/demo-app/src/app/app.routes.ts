import { Routes } from '@angular/router';
import { DemoListComponent } from './demo-list/demo-list.component';
import { ThemeDemoComponent } from './demos/theme-demo.component';
import {ButtonDemo} from './button-demo/button-demo';
import { AlertsDemoComponent } from './demos/alerts-demo.component';
import { InputDemoComponent } from './input-demo/input-demo';
import { ConfigDemoComponent } from './demos/config-demo.component';
import {DualHorizontalImageDemo} from './dual-horizontal-image-demo/dual-horizontal-image-demo';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'demos', component: DemoListComponent, title: 'Demos' },
  { path: 'demos/theme', component: ThemeDemoComponent, title: 'Theme Demo' },
  { path: 'demos/alerts', component: AlertsDemoComponent, title: 'Alerts Demo' },
  { path: 'demos/button-demo', component: ButtonDemo, title: 'Button Demo' },
  { path: 'demos/input-demo', component: InputDemoComponent, title: 'Input Demo' },
  { path: 'demos/config', component: ConfigDemoComponent, title: 'Config Demo' },
  { path: 'demos/dual-horizontal-image-demo', component: DualHorizontalImageDemo, title: 'DualImageHorizontal Demo' },
  // Future demos can be added here following the same pattern
];
