import { Component, inject, InjectionToken } from '@angular/core';
import { MnLanguageService, MnTranslatePipe, MnConfigService, provideMnComponentConfig, MnInputField, MnTextarea, MN_SECTION_PATH } from 'mn-angular-lib';
import { AsyncPipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';

export interface ReactiveConfigDemo {
  title: string;
  description: string;
  label: string;
}

const REACTIVE_CFG = new InjectionToken<ReactiveConfigDemo>('REACTIVE_CFG');

@Component({
  selector: 'app-language-demo',
  standalone: true,
  imports: [MnTranslatePipe, AsyncPipe, MnInputField, MnTextarea, ReactiveFormsModule],
  providers: [
    provideMnComponentConfig<ReactiveConfigDemo>(REACTIVE_CFG, 'language-demo-reactive'),
    { provide: MN_SECTION_PATH, useValue: ['root', 'language-demo'] },
  ],
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

      <!-- 4. Reactive config (provideMnComponentConfig) -->
      <section>
        <h2>{{ 'demo.reactive_config.title' | mnTranslate }}</h2>
        <p>{{ 'demo.reactive_config.description' | mnTranslate }}</p>
        <div class="example">
          <h3>mn-config.json5</h3>
          <code>title: {{ '{' }} $translate: "demo.reactive_config.title" {{ '}' }}</code><br/>
          <code>description: {{ '{' }} $translate: "demo.reactive_config.description" {{ '}' }}</code><br/>
          <code>label: {{ '{' }} $translate: "demo.reactive_config.label", params: {{ '{' }} name: "World" {{ '}' }} {{ '}' }}</code>
          <h3>Resolved via provideMnComponentConfig (reactive)</h3>
          <p class="result">Title: {{ reactiveCfg.title }}</p>
          <p class="result">Description: {{ reactiveCfg.description }}</p>
          <p class="result">Label: {{ reactiveCfg.label }}</p>
        </div>
      </section>

      <!-- 5. Reactive form fields (internal components) -->
      <section>
        <h2>{{ 'demo.form.section_title' | mnTranslate }}</h2>
        <p>{{ 'demo.form.section_description' | mnTranslate }}</p>
        <div class="example">
          <h3>mn-config.json5</h3>
          <code>placeholder: {{ '{' }} $translate: "demo.form.name.placeholder" {{ '}' }}</code><br/>
          <code>label: {{ '{' }} $translate: "demo.form.name.label" {{ '}' }}</code>
          <h3>mn-input-field (switch locale to see placeholder/label update)</h3>
          <mn-lib-input-field [formControl]="nameCtrl" [props]="{ id: 'demo-name', type: 'text', size: 'md', borderRadius: 'md' }"></mn-lib-input-field>
        </div>
        <div class="example">
          <h3>mn-textarea (switch locale to see placeholder/label update)</h3>
          <mn-lib-textarea [formControl]="messageCtrl" [props]="{ id: 'demo-message', size: 'md', borderRadius: 'md', rows: 3 }"></mn-lib-textarea>
        </div>
      </section>

      <!-- 6. Validation with translated error messages -->
      <section>
        <h2>{{ 'demo.validation.section_title' | mnTranslate }}</h2>
        <p>{{ 'demo.validation.section_description' | mnTranslate }}</p>
        <div class="example">
          <h3>mn-config.json5</h3>
          <code>errorMessages: {{ '{' }} required: {{ '{' }} $translate: "validation.required" {{ '}' }} {{ '}' }}</code>
          <h3>mn-input-field (required) — touch and clear to see translated error</h3>
          <mn-lib-input-field [formControl]="valNameCtrl" [props]="{ id: 'validation-name', type: 'text', size: 'md', borderRadius: 'md' }"></mn-lib-input-field>
        </div>
        <div class="example">
          <h3>mn-input-field (required + email) — enter invalid email to see translated error</h3>
          <mn-lib-input-field [formControl]="valEmailCtrl" [props]="{ id: 'validation-email', type: 'email', size: 'md', borderRadius: 'md' }"></mn-lib-input-field>
        </div>
        <div class="example">
          <h3>mn-textarea (required) — touch and clear to see translated error</h3>
          <mn-lib-textarea [formControl]="valMessageCtrl" [props]="{ id: 'validation-message', size: 'md', borderRadius: 'md', rows: 3 }"></mn-lib-textarea>
        </div>
      </section>

      <!-- 7. Locale observable -->
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
  readonly reactiveCfg = inject(REACTIVE_CFG);

  standaloneResult = '';
  standaloneParamResult = '';
  configResolved = '';
  nameCtrl = new FormControl('');
  messageCtrl = new FormControl('');
  valNameCtrl = new FormControl('', [Validators.required]);
  valEmailCtrl = new FormControl('', [Validators.required, Validators.email]);
  valMessageCtrl = new FormControl('', [Validators.required]);

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
