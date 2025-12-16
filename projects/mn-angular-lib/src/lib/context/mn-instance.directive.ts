import { Attribute, Directive, Input } from '@angular/core';
import { MN_INSTANCE_ID } from './mn-context.tokens';

@Directive({
  selector: '[mn-instance]',
  standalone: true,
  providers: [
    {
      provide: MN_INSTANCE_ID,
      // Read the attribute at provider creation time using Attribute token; Inputs may not be set yet.
      deps: [new Attribute('mn-instance')],
      useFactory: (attr: string | null) => (attr ?? '').trim() || null,
    },
  ],
})
export class MnInstanceDirective {
  /** Instance id for targeting per-component instance overrides */
  @Input('mn-instance') mnInstance: string | undefined;
}
