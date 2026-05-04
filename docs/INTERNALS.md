# MnLib Internals

This document explains the internal architecture and logic of MnLib.

## Design Goals

1.  **Lightweight & Standalone**: Minimal dependencies (Angular, json5, RxJS).
2.  **Centralized Config**: Manage behavior and UI of many components from a single file.
3.  **Circular Dependency Prevention**: Services are designed to avoid importing each other directly where possible.
4.  **Flexible Translation**: Integrated with the config system but also usable standalone.

---

## MnConfigService Architecture

### 1. Loading Phase (`load()`)
-   The service uses `HttpClient` to fetch a file (usually `.json5`).
-   It uses the `json5` library to parse the content. JSON5 was chosen because it supports:
    -   Comments (useful for documenting config settings).
    -   Trailing commas.
    -   Unquoted keys.
-   After parsing, it extracts four main sections: `settings`, `defaults`, `overrides`, and `language`.
-   The `settings` section holds general metadata (currently `version` and `name`) and is exposed via the `settings` getter on `MnConfigService`.
-   **Config-to-Language Push**: If a `language` section is present, `MnConfigService` manually configures `MnLanguageService` with the provided settings. This "push" mechanism ensures `MnLanguageService` doesn't need to know about `MnConfigService`, preventing a circular dependency.

### 2. Resolution Phase (`resolve()`)
The `resolve` method follows a strict hierarchy to determine the final configuration object:

1.  **Start with Defaults**: Look up `defaults[componentName]`.
2.  **Traverse Overrides**:
    -   It uses `walkOverrides` to navigate the `overrides` tree based on the provided `sectionPath` (e.g., `['admin', 'dashboard']`).
    -   If a matching node is found, it merges `node[componentName]` into the resolved object using a **deep merge**.
3.  **Instance Override**:
    -   If an `instanceId` is provided, it looks for a key starting with `#` (e.g., `#main-login-form`) within the same override node.
    -   If found, it deep-merges this specific instance config over the previous result.
4.  **Translatable Resolution**:
    -   Finally, it recursively walks the entire resolved object.
    -   Any value that matches the `isTranslatable` check (an object with a `$translate` property) is replaced by the result of `MnLanguageService.translate()`.

---

## MnLanguageService Architecture

### 1. Translation Management
-   Translations are stored in a private object keyed by locale: `{ 'en': { 'key': 'value' }, 'nl': { ... } }`.
-   `registerTranslations` allows adding translations manually from code.
-   `loadLocale` fetches translation JSONs on demand via `HttpClient`.

### 2. Interpolation
The `translate` method uses a simple Regex-based interpolation:
-   It searches for `{{key}}` placeholders in the translation string.
-   It replaces them with values from the `params` object.

### 3. Domain-Based Locale Selection
During the initialization (triggered by `MnConfigService.load`), the language service can determine the best locale:
-   It looks at `window.location.hostname`.
-   It matches it against the `domainLocaleMap` provided in the config.
-   Example: `example.de` -> `de`, `example.com` -> `en`.

---

## Circular Dependency Strategy

One of the main challenges was that `MnConfigService` needs to translate values (using `MnLanguageService`), and `MnLanguageService` needs its settings (which usually come from the config file).

**The Solution:**
1.  `MnLanguageService` is completely independent. It knows nothing about `MnConfigService`.
2.  `MnConfigService` imports `MnLanguageService`.
3.  When `MnConfigService` loads the JSON5 file, it extracts the language-related settings and calls `MnLanguageService.configure(...)` and `MnLanguageService.setLocale(...)`.
4.  This keeps the dependency graph one-way: `App -> Config -> Language`.

---

## Key Utility Functions

-   `deepMerge`: Recursively merges two objects. Arrays and primitives from the patch always overwrite the base.
-   `walkOverrides`: A safe-navigation function that follows a string array path through a nested object.
-   `isTranslatable`: Checks if a value is an object containing `$translate`.
