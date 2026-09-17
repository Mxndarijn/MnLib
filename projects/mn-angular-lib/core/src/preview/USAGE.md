# Live Preview Mode

MnLib supports a **live preview** feature where an external editor (e.g., Mn Web Manager) can push config and translation changes into a running application via `postMessage` — without affecting live visitors.

## How It Works

```
Mn Web Manager (editor)          Target Website (iframe)
┌──────────────────┐             ┌──────────────────────┐
│ Config Editor    │──postMessage──▶ MnConfigService     │
│ Translation Editor│──postMessage──▶ MnLanguageService   │
└──────────────────┘             └──────────────────────┘
```

- `postMessage()` is browser-internal — only the editor's browser tab is affected.
- Live visitors see nothing until the editor explicitly publishes.

---

## Quick Setup

Call `enableMnPreviewMode()` once during app bootstrap:

```typescript
import { Component, inject } from '@angular/core';
import { MnConfigService, MnLanguageService, enableMnPreviewMode } from 'mn-angular-lib';

@Component({ ... })
export class AppComponent {
  constructor() {
    enableMnPreviewMode(
      inject(MnConfigService),
      inject(MnLanguageService),
      ['https://mn-web-manager.example.com'] // optional origin whitelist
    );
  }
}
```

Or in an `APP_INITIALIZER`:

```typescript
{
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (config: MnConfigService, lang: MnLanguageService) => () => {
    enableMnPreviewMode(config, lang);
  },
  deps: [MnConfigService, MnLanguageService],
}
```

---

## Message Protocol

The listener expects `postMessage` events with the following shapes:

### Config Update

```typescript
window.postMessage({
  type: 'mn-config-update',
  config: {
    settings: { version: '1.0.0', name: 'my-app' },
    defaults: { /* ... */ },
    overrides: { /* ... */ },
    language: { /* ... */ }   // optional
  }
});
```

This calls `MnConfigService.loadFromObject()` which replaces the entire config in memory and bumps the reactive `configVersion` signal.

### Translations Update

```typescript
window.postMessage({
  type: 'mn-translations-update',
  translations: {
    en: { 'greeting': 'Hello!', 'farewell': 'Goodbye!' },
    nl: { 'greeting': 'Hallo!', 'farewell': 'Tot ziens!' }
  }
});
```

This calls `MnLanguageService.registerTranslations()` for each locale and then re-sets the current locale to trigger re-rendering.

---

## Reacting to Config Changes

`MnConfigService` exposes a reactive **`configVersion`** signal (Angular Signal, read-only) that increments every time config is loaded — either via `load()` or `loadFromObject()`.

### Using `effect()`

```typescript
import { effect, inject } from '@angular/core';
import { MnConfigService } from 'mn-angular-lib';

@Component({ ... })
export class MyComponent {
  private configService = inject(MnConfigService);

  config: any;

  constructor() {
    effect(() => {
      // Re-runs whenever configVersion changes
      const _version = this.configService.configVersion();
      this.config = this.configService.resolve('my-component', ['section']);
    });
  }
}
```

### Using `computed()`

```typescript
config = computed(() => {
  const _version = this.configService.configVersion();
  return this.configService.resolve('my-component', ['section']);
});
```

---

## `loadFromObject()` API

You can also call `loadFromObject()` directly without the preview listener:

```typescript
await configService.loadFromObject({
  defaults: { 'my-comp': { color: 'red' } },
  overrides: {}
});
```

Pass `bootstrapLanguage: true` as the second argument to also re-initialize the language service from the config's `language` section:

```typescript
await configService.loadFromObject(fullConfig, true);
```

---

## Security

When calling `enableMnPreviewMode()`, pass an `allowedOrigins` array to restrict which origins can send messages:

```typescript
enableMnPreviewMode(configService, langService, ['https://trusted-editor.example.com']);
```

If omitted, messages from **any origin** are accepted — only suitable for development.
