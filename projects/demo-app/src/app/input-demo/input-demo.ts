import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MnInput } from 'mn-angular-lib';

@Component({
  selector: 'app-input-demo',
  standalone: true,
  imports: [FormsModule, MnInput],
  templateUrl: './input-demo.html',
  styles: [`
    .demo-grid { display: grid; gap: 16px; max-width: 640px; }
    .group { padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
    .values { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; color: #374151; background: #f9fafb; padding: 8px; border-radius: 6px; }
  `]
})
export class InputDemoComponent {
  model = {
    text: '',
    email: '',
    password: '',
    number: 5,
    date: '',
    description: ''
  };
}
