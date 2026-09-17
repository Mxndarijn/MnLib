import {Directive, ElementRef, inject, Input, OnChanges, Renderer2} from '@angular/core';

/**
 * Attribute directive that applies responsive-hiding classes to table cells/headers.
 * Hides the element by default and shows it as `table-cell` at the specified breakpoint.
 *
 * The breakpoints are **container** queries against the table's own width, not the
 * viewport: a table inside a modal (or any narrow column) is far narrower than the
 * window, so viewport breakpoints would reveal columns the table has no room for.
 * mn-table marks its chrome `@container` for exactly this.
 *
 * Because of that, `sm`/`md`/`lg` mean "the table is at least this wide", and the
 * thresholds are **not** the viewport values of the same names — see {@link classMap}.
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

  /**
   * Static mapping of breakpoints to their full Tailwind class names, so Tailwind
   * can detect them at build time.
   *
   * These are **container** widths, deliberately lower than the viewport
   * breakpoints they are named after. A table almost never gets the whole window:
   * a page table sits inside a docked sidebar plus page padding, which on a
   * 1280px screen leaves it under 900px. Reusing 1024px for `lg` would demand a
   * ~1400px window before an `lg` column ever appeared — hiding columns on the
   * most ordinary laptop. These values instead express how much room the column
   * itself needs, which is what a container query should measure.
   */
  private readonly classMap: Record<string, string[]> = {
    sm: ['hidden', '@min-[480px]:table-cell'],
    md: ['hidden', '@min-[640px]:table-cell'],
    lg: ['hidden', '@min-[800px]:table-cell'],
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
