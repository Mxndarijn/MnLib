# MnLib — Angular Component Library

## Project layout

Angular workspace with two projects:

- `projects/mn-angular-lib/` — publishable library (npm: `mn-angular-lib`)
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

## Non-obvious conventions

**Selectors** — library components use `mn-lib-*` selectors internally; the published API uses `mn-*` prefixes. Directives use camelCase `mn` prefix; components use kebab-case `mn` prefix. Two exceptions: `mn-badge` and `mn-button` use attribute selectors on native elements (`span[mnBadge]`, `button[mnButton]`) — the `@angular-eslint/component-selector` rule is disabled for those files.

**Types over interfaces** — `@typescript-eslint/consistent-type-definitions` enforces `type` everywhere. Never use `interface`.

**Intentionally-unused params** — prefix with `_` (e.g. `_event`) to satisfy `no-unused-vars` without disabling it.

**Empty functions** — ControlValueAccessor stubs (`onChange`, `onTouched`) and no-op subscriptions are intentionally empty. The ESLint config allows empty constructors, methods, async methods, and arrow functions.

**i18n** — all user-facing strings in templates must use the translation pipe or interpolation, never hardcoded English. Run `npm run lint:i18n` to verify.

**Config system** — `MnConfigService.resolve()` merges `defaults` → section `overrides` → instance `#id` overrides. Components inject `MN_SECTION_PATH` and `MN_INSTANCE_ID` tokens to scope config resolution.

## CI/CD pipeline (`.github/workflows/main.yml`)

Triggers on push to `main`. Runs lint → tests → version patch bump → build → npm publish. A lint or test failure blocks the release.
