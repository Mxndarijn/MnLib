import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'demo-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './demo-page.component.html'
})
export class DemoPageComponent {
  @Input() title = '';
}
