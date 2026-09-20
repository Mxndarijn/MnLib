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

**Change detection — every component is OnPush.** Angular 22 made `OnPush` the default and renamed
the old default to `ChangeDetectionStrategy.Eager`; the whole library runs on the new default, so a
component simply omits the property (a handful still spell `OnPush` out, which is the same thing).
Never write `Eager` in library code —
`@angular-eslint/prefer-on-push-component-change-detection` fails the build on it. The consuming
apps are zoneless, where an unmarked view is not checked at all, so **state that changes outside a
listener Angular wraps has to mark itself** with `inject(ChangeDetectorRef)` + `markForCheck()`:
a subscription, a value written after an `await`, a timer or observer callback, a
ControlValueAccessor's `writeValue` (the forms API writes in from outside), and any public method a
consumer can call without an event behind it (`toggle()`, `close()`, …). A template or `@HostListener`
event, a signal write and an input binding all mark the view by themselves and need nothing. Writing
straight to the DOM (`el.style…`) needs nothing either.

The Karma suite runs **with** zone.js, so it cannot prove any of this on its own; the regression
coverage lives in `*.zoneless.spec.ts` files that add `provideZonelessChangeDetection()`, use
`fixture.autoDetectChanges()` and deliberately never call `detectChanges()` after the act. Drive the
component through a host with a signal-backed binding, the way an app does, and always confirm a new
spec fails with the fix reverted.

**Spec host components are the exception**: a `@Component` inside a `describe()` keeps
`ChangeDetectionStrategy.Eager`, because an OnPush host that nothing marks dirty makes
`fixture.detectChanges()` skip the component under test. The lint rule stands down for `*.spec.ts`.

**Node** — `engines` in the root `package.json` states the floor Angular 22 requires
(`^22.22.3 || ^24.15.0 || >=26.0.0`); an older Node fails the CLI outright.

**Config system** — `MnConfigService.resolve()` merges `defaults` → section `overrides` → instance `#id` overrides. Components inject `MN_SECTION_PATH` and `MN_INSTANCE_ID` tokens to scope config resolution.

## CI/CD pipeline (`.github/workflows/main.yml`)

Triggers on push to `main`. Runs lint → tests → version patch bump → build → npm publish. A lint or test failure blocks the release.
