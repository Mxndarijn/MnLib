import { Routes } from '@angular/router';
import { DemoListComponent } from './demo-list/demo-list.component';
import { ThemeDemoComponent } from './demos/theme-demo.component';
import { AlertsDemoComponent } from './demos/alerts-demo.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'demos', component: DemoListComponent, title: 'Demos' },
  { path: 'demos/theme', component: ThemeDemoComponent, title: 'Theme Demo' },
  { path: 'demos/alerts', component: AlertsDemoComponent, title: 'Alerts Demo' },
];
