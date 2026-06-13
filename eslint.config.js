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
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {},
  },
  prettierConfig,
]);
