// @ts-check
const eslint = require("@eslint/js");
const {defineConfig} = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const prettierConfig = require("eslint-config-prettier");

module.exports = defineConfig([
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      // ControlValueAccessor stubs (onChange/onTouched) and Observer no-ops (subscribe/handle)
      // are intentionally empty in Angular — this is idiomatic, not a code smell.
      "@typescript-eslint/no-empty-function": ["error", {"allow": ["constructors", "methods", "asyncMethods", "arrowFunctions"]}],
      // Ignore _ prefixed names — the community convention for intentionally unused params/vars.
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
    },
  },
  {
    // A spec's host component is scaffolding, not shipped UI. Angular 22 makes an omitted
    // strategy OnPush, and an OnPush host that nothing marks dirty is skipped by
    // `fixture.detectChanges()` — the component under test then never re-renders. Those hosts
    // keep `ChangeDetectionStrategy.Eager`, so this rule has to stand down for them.
    files: ["**/*.spec.ts"],
    rules: {
      "@angular-eslint/prefer-on-push-component-change-detection": "off",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {},
  },
  prettierConfig,
]);
