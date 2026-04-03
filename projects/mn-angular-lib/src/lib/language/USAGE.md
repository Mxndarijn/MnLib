# MnLanguageService

A standalone translation/i18n service that also integrates with `MnConfigService`.

## Setup

### 1. Create translation files

`assets/i18n/en.json`:
```json
{
  "form.email.label": "Email Address",
  "form.email.placeholder": "Enter your email",
  "greeting": "Hello, {{name}}!"
}
```

`assets/i18n/nl.json`:
```json
{
  "form.email.label": "E-mailadres",
  "form.email.placeholder": "Voer uw e-mail in",
  "greeting": "Hallo, {{name}}!"
}
```

### 2a. Register via config file (recommended)

Add a `language` section to your `mn-config.json5`:

```json5
{
  language: {
    urlPattern: "assets/i18n/{locale}.json",
    defaultLocale: "en",
    preload: ["en", "nl"]
  },
  defaults: { /* ... */ },
  overrides: { /* ... */ }
}
```

When `MnConfigService.load()` runs, it reads the `language` section and automatically
configures the `MnLanguageService` — no extra provider needed. This avoids circular
dependencies because the config service pushes settings into the language service
(the language service never imports the config service).

### 2b. Register via provider (standalone, without config)

```ts
import { provideMnLanguage } from 'mn-angular-lib';

export const appConfig = {
  providers: [
    ...provideMnLanguage({
      urlPattern: 'assets/i18n/{locale}.json',
      defaultLocale: 'en',
      preload: ['en', 'nl'],
    }),
  ],
};
```

## Standalone usage (without config)

### In code (service)

```ts
import { MnLanguageService } from 'mn-angular-lib';

class MyComponent {
  private lang = inject(MnLanguageService);

  label = this.lang.t('form.email.label');
  greeting = this.lang.t('greeting', { name: 'World' }); // "Hello, World!"

  async switchToNl() {
    await this.lang.setLocale('nl');
  }
}
```

### In templates (pipe)

```html
<label>{{ 'form.email.label' | mnTranslate }}</label>
<p>{{ 'greeting' | mnTranslate:{ name: userName } }}</p>
```

### Register translations from code (no HTTP)

```ts
lang.registerTranslations('en', {
  'my.key': 'My Value',
});
```

## Integration with MnConfigService

Config values can be either plain values or translatable markers using `{ $translate: "key" }`:

### mn-config.json5

```json5
{
  language: {
    urlPattern: "assets/i18n/{locale}.json",
    defaultLocale: "en",
    preload: ["en", "nl"]
  },
  defaults: {
    "mn-input-field": {
      label: { $translate: "form.email.label" },           // translated via MnLanguageService
      placeholder: "Static placeholder",                     // plain string, used as-is
      ariaLabel: { $translate: "greeting", params: { name: "User" } },  // with interpolation
    }
  }
}
```

When `MnConfigService.resolve()` is called, any `{ $translate: "..." }` markers are automatically
replaced with the translated string for the current locale. Plain values pass through unchanged.
