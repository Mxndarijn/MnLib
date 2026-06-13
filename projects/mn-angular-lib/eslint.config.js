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
    files: ["**/*.html"],
    rules: {},
  }
]);
