import { Component, InjectionToken, inject } from '@angular/core';

import { provideMnComponentConfig } from '../../config/mn-component-config.providers';

interface TestConfig {
  text?: string;
  color?: string;
}

export const MN_TEST_COMPONENT_CONFIG = new InjectionToken<TestConfig>('MN_TEST_COMPONENT_CONFIG');

@Component({
  selector: 'mn-test-component',
  standalone: true,
  imports: [],
  providers: [
    provideMnComponentConfig<TestConfig>(MN_TEST_COMPONENT_CONFIG, 'test-component'),
  ],
  template: `
    <div class="mn-test" [style.color]="(cfg.color ?? 'inherit')">
      {{ cfg.text ?? 'Hello from component' }}
    </div>
  `,
  styles: [`
    .mn-test { font-weight: 600; padding: 8px 12px; border: 1px dashed #ddd; border-radius: 6px; }
  `]
})
export class MnTestComponent {
  readonly cfg = inject(MN_TEST_COMPONENT_CONFIG);
}
