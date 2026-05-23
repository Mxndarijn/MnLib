import {Directive, ElementRef, Input, OnChanges, Renderer2, inject} from '@angular/core';

/**
 * Attribute directive that applies responsive-hiding classes to table cells/headers.
 * Hides the element by default and shows it as `table-cell` at the specified breakpoint.
 *
 * Usage: `<td [mnHiddenBelow]="column.hiddenBelow">`
 */
@Directive({
  selector: '[mnHiddenBelow]',
  standalone: true,
})
export class MnHiddenBelowDirective implements OnChanges {
  @Input() mnHiddenBelow: 'sm' | 'md' | 'lg' | undefined;

  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  private appliedClasses: string[] = [];

  ngOnChanges(): void {
    // Remove previously applied classes
    for (const cls of this.appliedClasses) {
      this.renderer.removeClass(this.el.nativeElement, cls);
    }
    this.appliedClasses = [];

    if (this.mnHiddenBelow) {
      const classes = ['hidden', `${this.mnHiddenBelow}:table-cell`];
      for (const cls of classes) {
        this.renderer.addClass(this.el.nativeElement, cls);
      }
      this.appliedClasses = classes;
    }
  }
}
