import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-demo-page',
  standalone: true,
  imports: [],
  templateUrl: './demo-page.component.html'
})
export class DemoPageComponent {
  @Input() title = '';
}
