// @ts-check
const {defineConfig} = require("eslint/config");
const rootConfig = require("../../eslint.config.js");

module.exports = defineConfig([
  ...rootConfig,
  {
    files: ["**/*.ts"],
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "mn",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "mn",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    // mn-badge and mn-button are components that target native HTML elements using
    // attribute selectors (span[mnBadge], button[mnButton]). The element-only selector
    // rule doesn't apply to this pattern.
    files: ["**/mn-badge/mn-badge.ts", "**/mn-button/mn-button.ts"],
    rules: {
      "@angular-eslint/component-selector": "off",
    },
  },
  {
    // Inline test-host components in specs exist only to mount the component under test.
    // Their change-detection strategy is a harness detail, not a shipped concern, so the
    // OnPush-preference rule (which stays enforced on every real component) is off here.
    // The Angular 22 update marks these hosts `ChangeDetectionStrategy.Eager`; several
    // specs mutate host state and re-read the DOM, which relies on that eager checking.
    files: ["**/*.spec.ts"],
    rules: {
      "@angular-eslint/prefer-on-push-component-change-detection": "off",
    },
  },
  {
    files: ["**/*.html"],
    rules: {},
  }
]);
