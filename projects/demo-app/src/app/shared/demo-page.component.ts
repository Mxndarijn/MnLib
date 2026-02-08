import { Component, Input } from '@angular/core';


@Component({
  selector: 'demo-page',
  standalone: true,
  imports: [],
  templateUrl: './demo-page.component.html'
})
export class DemoPageComponent {
  @Input() title = '';
}
