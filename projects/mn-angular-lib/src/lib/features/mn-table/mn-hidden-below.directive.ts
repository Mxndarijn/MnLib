import {Directive, ElementRef, Input, OnChanges, Renderer2, inject} from '@angular/core';

/**
 * Attribute directive that applies responsive-hiding classes to table cells/headers.
 * Hides the element by default and shows it as `table-cell` at the specified breakpoint.
 *
 * Uses a static class map so Tailwind CSS can detect the full class names at build time.
 *
 * Usage: `<td [mnHiddenBelow]="column.hiddenBelow">`
 */
@Directive({
  selector: '[mnHiddenBelow]',
  standalone: true,
})
export class MnHiddenBelowDirective implements OnChanges {
  /** The breakpoint below which the element is hidden. */
  @Input() mnHiddenBelow: 'sm' | 'md' | 'lg' | undefined;

  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  private appliedClasses: string[] = [];

  /** Static mapping of breakpoints to their full Tailwind class names. */
  private readonly classMap: Record<string, string[]> = {
    sm: ['hidden', 'sm:table-cell'],
    md: ['hidden', 'md:table-cell'],
    lg: ['hidden', 'lg:table-cell'],
  };

  ngOnChanges(): void {
    // Remove previously applied classes
    for (const cls of this.appliedClasses) {
      this.renderer.removeClass(this.el.nativeElement, cls);
    }
    this.appliedClasses = [];

    if (this.mnHiddenBelow && this.classMap[this.mnHiddenBelow]) {
      const classes = this.classMap[this.mnHiddenBelow];
      for (const cls of classes) {
        this.renderer.addClass(this.el.nativeElement, cls);
      }
      this.appliedClasses = classes;
    }
  }
}
