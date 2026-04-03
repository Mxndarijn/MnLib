import { Component, inject } from '@angular/core';
import { MnLanguageService, MnTranslatePipe, MnConfigService } from 'mn-angular-lib';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-language-demo',
  standalone: true,
  imports: [MnTranslatePipe, AsyncPipe],
  template: `
    <div class="container">
      <h1>{{ 'demo.title' | mnTranslate }}</h1>
      <p>{{ 'demo.subtitle' | mnTranslate }}</p>

      <!-- Locale switcher -->
      <section>
        <h2>{{ 'demo.switch_locale' | mnTranslate }}</h2>
        <p>{{ 'demo.current_locale' | mnTranslate:{ locale: lang.locale } }}</p>
        <div class="button-row">
          <button (click)="switchLocale('en')" [class.active]="lang.locale === 'en'">English</button>
          <button (click)="switchLocale('nl')" [class.active]="lang.locale === 'nl'">Nederlands</button>
        </div>
      </section>

      <!-- 1. Pipe usage -->
      <section>
        <h2>{{ 'demo.pipe.title' | mnTranslate }}</h2>
        <p>{{ 'demo.pipe.description' | mnTranslate }}</p>
        <div class="example">
          <h3>Template</h3>
          <code>{{ "{{ 'demo.greeting' | mnTranslate:{ name: 'World' } }}" }}</code>
          <h3>Result</h3>
          <p class="result">{{ 'demo.greeting' | mnTranslate:{ name: 'World' } }}</p>
        </div>
        <div class="example">
          <h3>Template</h3>
          <code>{{ "{{ 'demo.items_count' | mnTranslate:{ count: 5 } }}" }}</code>
          <h3>Result</h3>
          <p class="result">{{ 'demo.items_count' | mnTranslate:{ count: 5 } }}</p>
        </div>
      </section>

      <!-- 2. Standalone service usage -->
      <section>
        <h2>{{ 'demo.standalone.title' | mnTranslate }}</h2>
        <p>{{ 'demo.standalone.description' | mnTranslate }}</p>
        <div class="example">
          <h3>Code</h3>
          <code>this.lang.t('demo.welcome')</code>
          <h3>Result</h3>
          <p class="result">{{ standaloneResult }}</p>
        </div>
        <div class="example">
          <h3>Code</h3>
          <code>this.lang.translate('demo.greeting', {{ '{' }} name: 'Angular' {{ '}' }})</code>
          <h3>Result</h3>
          <p class="result">{{ standaloneParamResult }}</p>
        </div>
      </section>

      <!-- 3. Config integration -->
      <section>
        <h2>{{ 'demo.config.title' | mnTranslate }}</h2>
        <p>{{ 'demo.config.description' | mnTranslate }}</p>
        <div class="example">
          <h3>Config value</h3>
          <code>label: {{ '{' }} $translate: "demo.greeting", params: {{ '{' }} name: "Config" {{ '}' }} {{ '}' }}</code>
          <h3>Resolved</h3>
          <p class="result">{{ configResolved }}</p>
        </div>
      </section>

      <!-- 4. Locale observable -->
      <section>
        <h2>Locale Observable</h2>
        <p>Subscribe to <code>locale$</code> for reactive locale changes.</p>
        <div class="example">
          <h3>Current locale$ value</h3>
          <p class="result">{{ lang.locale$ | async }}</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .container { display: grid; gap: 16px; max-width: 800px; }
    h1 { margin: 0 0 4px; }
    section { padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
    h2 { margin-top: 0; font-size: 16px; }
    h3 { margin: 8px 0 4px; font-size: 13px; color: #666; }
    .example { padding: 8px 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 8px; }
    .result { font-weight: 600; color: #111; margin: 4px 0; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    .button-row { display: flex; gap: 8px; }
    button { padding: 6px 16px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
    button.active { background: #2563eb; color: #fff; border-color: #2563eb; }
  `]
})
export class LanguageDemo {
  readonly lang = inject(MnLanguageService);
  private readonly config = inject(MnConfigService);

  standaloneResult = '';
  standaloneParamResult = '';
  configResolved = '';

  constructor() {
    this.refresh();
  }

  async switchLocale(locale: string) {
    await this.lang.setLocale(locale);
    this.refresh();
  }

  private refresh() {
    this.standaloneResult = this.lang.t('demo.welcome');
    this.standaloneParamResult = this.lang.translate('demo.greeting', { name: 'Angular' });

    // Demonstrate config resolving a $translate marker
    const resolved = this.config.resolve<{ label: string }>('language-demo-component');
    this.configResolved = resolved.label ?? '(no config value)';
  }
}
