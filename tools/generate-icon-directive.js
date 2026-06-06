/**
 * Generates mn-icon-attributes.directive.ts from the keys in MN_ICON_MAP.
 *
 * Usage:  node tools/generate-icon-directive.js
 */
const fs = require('fs');
const path = require('path');

const mapFilePath = path.resolve(
  __dirname,
  '../projects/mn-angular-lib/src/lib/features/mn-icon/mn-icon-map.ts'
);

const directiveFilePath = path.resolve(
  __dirname,
  '../projects/mn-angular-lib/src/lib/features/mn-icon/mn-icon-attributes.directive.ts'
);

// Read the icon map file and extract keys from the MN_ICON_MAP object
const mapContent = fs.readFileSync(mapFilePath, 'utf-8');

// Match keys like `pistol: pistolSvg,` or `pending: pendingSvg,`
const keyRegex = /^\s+(\w+)\s*:/gm;
const keys = [];
const mapBlock = mapContent.match(/MN_ICON_MAP[^{]*\{([^}]*)}/s);
if (mapBlock) {
  let match;
  while ((match = keyRegex.exec(mapBlock[1])) !== null) {
    keys.push(match[1]);
  }
}

if (keys.length === 0) {
  console.error('No icon keys found in MN_ICON_MAP. Aborting.');
  process.exit(1);
}

// Build selector: mn-icon[mnIconPistol], mn-icon[mnIconPending], ...
const selectorParts = keys.map((key) => {
  const attrName = 'mnIcon' + key.charAt(0).toUpperCase() + key.slice(1);
  return `mn-icon[${attrName}]`;
});

const selector = selectorParts.join(', ');

const output = `import { Directive } from '@angular/core';

// AUTO-GENERATED — do not edit manually.
// Run \`npm run generate:icons\` to regenerate after modifying MN_ICON_MAP.
@Directive({
  selector: '${selector}',
  standalone: true,
})
export class MnIconAttributes {}
`;

fs.writeFileSync(directiveFilePath, output, 'utf-8');
console.log(`Generated directive with selectors for: ${keys.join(', ')}`);
