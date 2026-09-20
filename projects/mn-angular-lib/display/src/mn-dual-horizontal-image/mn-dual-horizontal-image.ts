import { ChangeDetectorRef, Component, DestroyRef, inject, InjectionToken } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { skip } from 'rxjs';
import { MnDualHorizontalImageTypes } from './mn-dual-horizontal-imageTypes';
import { MnLanguageService, provideMnComponentConfig } from 'mn-angular-lib/core';

export type MnDualHorizontalImageConfig = {
  images?: MnDualHorizontalImageTypes[];
  noImagesFound?: string;
};

export const MN_LIB_DUAL_HORIZONTAL_IMAGE = new InjectionToken<MnDualHorizontalImageConfig>(
  'MN_LIB_DUAL_HORIZONTAL_IMAGE',
);

@Component({
  selector: 'mn-lib-dual-horizontal-image',
  standalone: true,
  imports: [NgOptimizedImage],
  providers: [
    provideMnComponentConfig<MnDualHorizontalImageConfig>(
      MN_LIB_DUAL_HORIZONTAL_IMAGE,
      'mn-dual-horizontal-image',
    ),
  ],
  templateUrl: './mn-dual-horizontal-image.html',
  host: {
    class: 'block',
  },
})
export class MnDualHorizontalImage {
  protected readonly componentConfig = inject(MN_LIB_DUAL_HORIZONTAL_IMAGE);

  /** Marks the view when a locale change rewrites the injected config (see the constructor). */
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly lang = inject(MnLanguageService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // `provideMnComponentConfig` resolves `$translate` markers by mutating the injected object
    // in place, which change detection cannot see. Every other config-reading component already
    // re-resolves on a locale change; this one only has to repaint.
    const sub = this.lang.locale$.pipe(skip(1)).subscribe(() => this.cdr.markForCheck());
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }
}
