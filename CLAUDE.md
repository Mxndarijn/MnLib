# MnLib — Angular Component Library

## Project layout

Angular workspace with two projects:

- `projects/mn-angular-lib/` — publishable library (npm: `mn-angular-lib`), split into secondary entry points (see below)
- `projects/demo-app/` — local demo/dev app (port 4500)
- `tools/` — custom Node scripts (icon generation, i18n lint)
- `dist/mn-angular-lib/` — build output (not committed)

## Commands

```bash
# Develop
npm start                                 # serve demo-app on :4500
ng serve                                  # same

# Build
npx ng build mn-angular-lib --configuration production
npx ng build                              # demo-app

# Test (library only)
npx ng test mn-angular-lib --watch=false --browsers=ChromeHeadless

# Lint
npx ng lint mn-angular-lib                # errors exit nonzero
npx ng lint --fix                         # auto-fix where possible

# Custom tools
npm run generate:icons    # regenerates mn-icon-attributes.directive.ts from MN_ICON_MAP
npm run lint:i18n         # scans .html files for hardcoded English strings
```

## Entry points

The library is **not** one module. Each folder under `projects/mn-angular-lib/` with an `ng-package.json` is a secondary entry point (`mn-angular-lib/<name>`), with its sources in `<name>/src/` and its exports in `<name>/public-api.ts`. The root `src/public-api.ts` only re-exports every entry point, so consumers keep importing from `mn-angular-lib`, while a bundler (esbuild splits by module) keeps each entry point in the chunk that uses it. As one file, every component a consumer used anywhere landed in its startup bundle.

| Entry | Holds |
|---|---|
| `core` | config, context, language, preview, HTTP/CRUD, shared types, `lucideIcons()` |
| `button` | button, badge, skeleton |
| `alert`, `bottom-sheet`, `keyboard`, `tab`, `segmented`, `rich-text-editor` | the component of that name |
| `forms` | input, checkbox, textarea, datetime, file input, select, multi-select, dropdown; also the internal `mn-error-message` and panel/listbox helpers (not exported) |
| `collection` | collection base, table, list, grid |
| `display` | card, breadcrumbs, icon, information card, dual image |
| `calendar-core` / `calendar` | calendar models, tokens and formatter / calendar views and the date selector bar |
| `modal-core` / `modal-ui` / `modal` | types, builders, `MnModalRef`, action icons / shell and body components / `MnModalService` |

Rules:
- **Across entry points, import by package specifier** (`from 'mn-angular-lib/forms'`), never a relative path: ng-packagr fails on files outside an entry's folder, and a relative import would copy the code into both entries. Within an entry, import relatively. The graph must stay acyclic.
- **`modal-ui` is loaded on demand.** `MnModalService` imports it with `import()` (and preloads it when the app is idle), because the shell renders every form field and the table; `open()` returns the ref at once and the shell attaches when loaded. Nothing a startup service needs may import `modal-ui` statically. Tests that assert on a freshly opened modal `await service.preload()` first.
- **Icons are `lucide` data**, rendered with `<svg [lucideIcon]="icons.X">` via `lucideIcons()` (`core`). Never a per-icon `@lucide/angular` component: each one compiles its own copy of the SVG template into the bundle.
- Karma finds specs across all entries because the project's `sourceRoot` is `projects/mn-angular-lib`.

## Non-obvious conventions

**Selectors** — library components use `mn-lib-*` selectors internally; the published API uses `mn-*` prefixes. Directives use camelCase `mn` prefix; components use kebab-case `mn` prefix. Two exceptions: `mn-badge` and `mn-button` use attribute selectors on native elements (`span[mnBadge]`, `button[mnButton]`) — the `@angular-eslint/component-selector` rule is disabled for those files.

**Types over interfaces** — `@typescript-eslint/consistent-type-definitions` enforces `type` everywhere. Never use `interface`.

**Intentionally-unused params** — prefix with `_` (e.g. `_event`) to satisfy `no-unused-vars` without disabling it.

**Empty functions** — ControlValueAccessor stubs (`onChange`, `onTouched`) and no-op subscriptions are intentionally empty. The ESLint config allows empty constructors, methods, async methods, and arrow functions.

**i18n** — all user-facing strings in templates must use the translation pipe or interpolation, never hardcoded English. Run `npm run lint:i18n` to verify.

**Config system** — `MnConfigService.resolve()` merges `defaults` → section `overrides` → instance `#id` overrides. Components inject `MN_SECTION_PATH` and `MN_INSTANCE_ID` tokens to scope config resolution.

## CI/CD pipeline (`.github/workflows/main.yml`)

Triggers on push to `main`. Runs lint → tests → version patch bump → build → npm publish. A lint or test failure blocks the release.
