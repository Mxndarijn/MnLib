import {Directive, ElementRef, inject, Input, OnChanges, Renderer2} from '@angular/core';

/**
 * Attribute directive that hides an element below the given breakpoint and shows it at/above.
 * Uses `hidden` + `{bp}:inline` so the element is invisible on small screens.
 *
 * Usage: `<span [mnShowAbove]="'sm'">`
 */
@Directive({
  selector: '[mnShowAbove]',
  standalone: true,
})
export class MnShowAboveDirective implements OnChanges {
  /** The breakpoint at/above which the element becomes visible. */
  @Input() mnShowAbove: 'sm' | 'md' | 'lg' | undefined;

  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  private appliedClasses: string[] = [];

  /** Static mapping of breakpoints to their full Tailwind class names. */
  private readonly classMap: Record<string, string[]> = {
    sm: ['hidden', 'sm:inline'],
    md: ['hidden', 'md:inline'],
    lg: ['hidden', 'lg:inline'],
  };

  ngOnChanges(): void {
    for (const cls of this.appliedClasses) {
      this.renderer.removeClass(this.el.nativeElement, cls);
    }
    this.appliedClasses = [];

    if (this.mnShowAbove && this.classMap[this.mnShowAbove]) {
      const classes = this.classMap[this.mnShowAbove];
      for (const cls of classes) {
        this.renderer.addClass(this.el.nativeElement, cls);
      }
      this.appliedClasses = classes;
    }
  }
}
