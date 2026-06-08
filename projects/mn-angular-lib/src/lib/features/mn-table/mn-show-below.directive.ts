import {Directive, ElementRef, inject, Input, OnChanges, Renderer2} from '@angular/core';

/**
 * Attribute directive that shows an element below the given breakpoint and hides it at/above.
 * Uses `inline` by default + `{bp}:hidden` so the element is only visible on small screens.
 *
 * Usage: `<span [mnShowBelow]="'sm'">`
 */
@Directive({
  selector: '[mnShowBelow]',
  standalone: true,
})
export class MnShowBelowDirective implements OnChanges {
  /** The breakpoint below which the element is visible. */
  @Input() mnShowBelow: 'sm' | 'md' | 'lg' | undefined;

  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  private appliedClasses: string[] = [];

  /** Static mapping of breakpoints to their full Tailwind class names. */
  private readonly classMap: Record<string, string[]> = {
    sm: ['inline', 'sm:hidden'],
    md: ['inline', 'md:hidden'],
    lg: ['inline', 'lg:hidden'],
  };

  ngOnChanges(): void {
    for (const cls of this.appliedClasses) {
      this.renderer.removeClass(this.el.nativeElement, cls);
    }
    this.appliedClasses = [];

    if (this.mnShowBelow && this.classMap[this.mnShowBelow]) {
      const classes = this.classMap[this.mnShowBelow];
      for (const cls of classes) {
        this.renderer.addClass(this.el.nativeElement, cls);
      }
      this.appliedClasses = classes;
    }
  }
}
