import { Pipe, PipeTransform } from '@angular/core';
import { MnLanguageService } from './mn-language.service';

/**
 * Pipe that translates a key via MnLanguageService.
 *
 * Usage in templates:
 *   {{ 'form.email.label' | mnTranslate }}
 *   {{ 'greeting' | mnTranslate:{ name: 'World' } }}
 *
 * Note: This pipe is impure so it re-evaluates when the locale changes.
 */
@Pipe({
  name: 'mnTranslate',
  standalone: true,
  pure: false,
})
export class MnTranslatePipe implements PipeTransform {
  constructor(private readonly lang: MnLanguageService) {}

  transform(key: string, params?: Record<string, string | number>): string {
    return this.lang.translate(key, params);
  }
}
