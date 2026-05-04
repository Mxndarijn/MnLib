# MnLib User Guide

MnLib is a lightweight Angular library providing powerful configuration management and internationalization (i18n) capabilities.

## Installation

Ensure you have `@angular/common` and `@angular/core` installed. MnLib also uses `json5` for configuration parsing.

```bash
npm install mn-angular-lib json5
```

## Getting Started

### 1. Provide Configuration and Language Services

In your `app.config.ts` (or `AppModule`), provide the services. It is recommended to use `provideMnConfig` which uses `APP_INITIALIZER` to load your configuration before the app starts.

```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideMnConfig, provideMnLanguage } from 'mn-angular-lib';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    // Load config from assets. Debug mode enabled.
    ...provideMnConfig('assets/config/mn-config.json5', true),
    // Optional: provide language settings if not using the config file for it
    ...provideMnLanguage({
      urlPattern: 'assets/i18n/{locale}.json',
      defaultLocale: 'en',
    })
  ]
};
```

### 2. Create a Configuration File

Create `assets/config/mn-config.json5`. JSON5 allows comments and unquoted keys.

```json5
{
  settings: {
    version: "1.0.0",
    name: "my-app"
  },
  language: {
    urlPattern: "assets/i18n/{locale}.json",
    defaultLocale: "en",
    preload: ["en", "nl"],
    domainLocaleMap: {
      "example.nl": "nl",
      "example.com": "en"
    }
  },
  defaults: {
    "mn-input-field": {
      label: { $translate: "form.email.label" },
      placeholder: "Enter value...",
      type: "text"
    }
  },
  overrides: {
    "admin-section": {
      "mn-input-field": {
        type: "password"
      }
    }
  }
}
```

## Configuration System

The `MnConfigService` allows you to manage component settings centrally.

### Resolving Config

In your component, use `MnConfigService.resolve()` to get the effective configuration.

```typescript
import { MnConfigService } from 'mn-angular-lib';

@Component({ ... })
export class MyInputFieldComponent implements OnInit {
  private configService = inject(MnConfigService);
  
  // Scoped to 'admin-section' if applicable
  config = this.configService.resolve('mn-input-field', ['admin-section']);
}
```

### Resolution Logic
1. **Defaults**: Takes the base values from `defaults['component-name']`.
2. **Overrides**: Merges values from `overrides['section']['path']['component-name']`.
3. **Instance Overrides**: If an `instanceId` is provided, it looks for `overrides['section']['path']['#instanceId']`.
4. **Translations**: Automatically replaces any `{ $translate: 'key' }` objects with translated strings.

---

## Internationalization (i18n)

### Translation Files

Create JSON files for your locales, e.g., `assets/i18n/en.json`:

```json
{
  "form.email.label": "Email Address",
  "greeting": "Hello, {{name}}!"
}
```

### Usage in Templates

Use the `mnTranslate` pipe:

```html
<label>{{ 'form.email.label' | mnTranslate }}</label>
<p>{{ 'greeting' | mnTranslate:{ name: 'User' } }}</p>
```

### Usage in Code

Inject `MnLanguageService`:

```typescript
import { MnLanguageService } from 'mn-angular-lib';

@Component({ ... })
export class MyComponent {
  private lang = inject(MnLanguageService);

  title = this.lang.t('greeting', { name: 'Admin' });

  async changeLanguage(code: string) {
    await this.lang.setLocale(code);
  }
}
```

### Domain-Based Locales

You can automatically set the default locale based on the current hostname by configuring `domainLocaleMap` in your config file. MnLib will check `window.location.hostname` and match it against your map.
