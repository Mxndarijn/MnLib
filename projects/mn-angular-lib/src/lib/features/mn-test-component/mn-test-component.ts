import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MN_INSTANCE_ID, MN_SECTION_PATH } from '../../context/mn-context.tokens';
import { MnConfigService } from '../../config/mn-config.service';

interface TestConfig {
  text?: string;
  color?: string;
}

@Component({
  selector: 'mn-test-component',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mn-test" [style.color]="color">
      {{ text }}
    </div>
  `,
  styles: [`
    .mn-test { font-weight: 600; padding: 8px 12px; border: 1px dashed #ddd; border-radius: 6px; }
  `]
})
export class MnTestComponent {
  private readonly sectionPath = inject(MN_SECTION_PATH, { optional: true }) ?? [];
  private readonly instanceId = inject(MN_INSTANCE_ID, { optional: true }) ?? undefined as string | undefined;
  private readonly cfg = inject(MnConfigService);

  private readonly componentName = 'test-component';

  text = 'default';
  color = 'inherit';

  ngOnInit(): void {
    const resolved = this.cfg.resolve<TestConfig>(this.componentName, this.sectionPath, this.instanceId ?? undefined);
    this.text = resolved.text ?? this.text;
    this.color = resolved.color ?? this.color;
  }
}
