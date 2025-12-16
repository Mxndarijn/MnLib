import { Attribute, Directive, Input, Optional, SkipSelf } from '@angular/core';
import { MN_SECTION_PATH } from './mn-context.tokens';

@Directive({
  selector: '[mn-section]',
  standalone: true,
  providers: [
    {
      provide: MN_SECTION_PATH,
      // Read parent MN_SECTION_PATH from ancestor injector (skipSelf to avoid self-reference),
      // and read the attribute value using Attribute so it's available at provider creation time.
      deps: [[new Optional(), new SkipSelf(), MN_SECTION_PATH], new Attribute('mn-section')],
      useFactory: (parentPath: string[] | null, attr: string | null) => {
        const parent = Array.isArray(parentPath) ? parentPath : [];
        const name = (attr ?? '').trim();
        return name ? [...parent, name] : [...parent];
      },
    },
  ],
})
export class MnSectionDirective {
  /** Section name contributed by this DOM node to the section path */
  @Input('mn-section') mnSection: string | undefined;
}
