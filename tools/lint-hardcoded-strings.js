#!/usr/bin/env node

/**
 * Lint script to detect hardcoded user-facing strings in Angular templates (.html).
 *
 * Scans all .html files under projects/mn-angular-lib/src/lib and reports any
 * text content between HTML tags that looks like a hardcoded English string
 * (i.e. not wrapped in {{ }} interpolation).
 *
 * Usage:
 *   node tools/lint-hardcoded-strings.js
 *
 * Add to CI:
 *   npm run lint:i18n
 */

const fs = require('fs');
const path = require('path');

const LIB_ROOT = path.join(__dirname, '..', 'projects', 'mn-angular-lib', 'src', 'lib');

// Recursively find all .html files
function findHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Determines if a text fragment is a hardcoded user-facing string.
 * Returns true only for multi-word English text that is NOT inside {{ }}.
 */
function isHardcodedUserString(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Skip if it's purely interpolation
  if (/^\{\{.*\}\}$/s.test(trimmed)) return false;

  // Remove all interpolation blocks to check what's left
  const withoutInterpolation = trimmed.replace(/\{\{[^}]*\}\}/g, '').trim();
  if (!withoutInterpolation) return false;

  // Skip HTML entities, symbols, single characters
  if (/^(&[a-zA-Z]+;|&#\d+;|[×«»‹›*+\-–—=|:;.,!?/\\<>#@^~`'"()\[\]{}…°•·\s])+$/.test(withoutInterpolation)) return false;

  // Skip pure numbers
  if (/^\d+$/.test(withoutInterpolation)) return false;

  // Must contain at least 2 consecutive word characters (looks like a real word)
  // and at least one space or be a known single-word pattern
  if (!/[a-zA-Z]{2,}/.test(withoutInterpolation)) return false;

  // Skip CSS class-like strings (hyphenated tokens, Tailwind utilities)
  if (/^[a-zA-Z0-9\-_:/\[\].\s]+$/.test(withoutInterpolation) && /[a-z]+-[a-z]+/.test(withoutInterpolation)) return false;

  // Must look like natural language: contains a space between words, or is a known UI word
  const knownSingleWords = /^(loading|submit|cancel|close|save|delete|confirm|next|back|complete|error|warning|success|info)$/i;
  const hasMultipleWords = /[a-zA-Z]+\s+[a-zA-Z]+/.test(withoutInterpolation);
  const isSingleKnownWord = knownSingleWords.test(withoutInterpolation);

  return hasMultipleWords || isSingleKnownWord;
}

/**
 * Extract text content from between HTML tags.
 * Uses a simple state machine to find >text< patterns while ignoring
 * tag attributes, Angular structural directives, and comments.
 */
function findHardcodedStrings(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  // Remove HTML comments
  const noComments = content.replace(/<!--[\s\S]*?-->/g, (match) => {
    return '\n'.repeat((match.match(/\n/g) || []).length);
  });

  // Remove <svg>...</svg> blocks (not user-facing)
  const noSvg = noComments.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
    return '\n'.repeat((match.match(/\n/g) || []).length);
  });

  // Find text content between > and <
  // This regex captures text that appears after a closing > and before an opening <
  const lines = noSvg.split('\n');
  let inTag = false;
  let tagDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip Angular control flow lines
    if (/^\s*@(if|for|switch|case|default|else|empty|defer|placeholder|loading|error)\b/.test(line)) continue;
    if (/^\s*\}/.test(line)) continue;

    // Extract text between > and < on the same line
    const regex = />([^<]+)</g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const textContent = match[1];
      if (isHardcodedUserString(textContent)) {
        issues.push({
          line: i + 1,
          text: textContent.trim(),
        });
      }
    }

    // Check for standalone text lines (not starting with < or Angular syntax)
    if (
      trimmedLine &&
      !trimmedLine.startsWith('<') &&
      !trimmedLine.startsWith('@') &&
      !trimmedLine.startsWith('}') &&
      !trimmedLine.startsWith('{') &&
      !trimmedLine.startsWith('*') &&
      !trimmedLine.startsWith('[') &&
      !trimmedLine.startsWith('(') &&
      !trimmedLine.startsWith('#') &&
      !trimmedLine.startsWith('|') &&
      !trimmedLine.startsWith('"') &&
      !trimmedLine.startsWith("'") &&
      !trimmedLine.startsWith('`') &&
      // Skip lines that look like attribute continuations
      !/^[a-zA-Z-]+[:=]/.test(trimmedLine) &&
      !/^\w+:/.test(trimmedLine)
    ) {
      if (isHardcodedUserString(trimmedLine)) {
        const alreadyReported = issues.some(iss => iss.line === i + 1);
        if (!alreadyReported) {
          issues.push({
            line: i + 1,
            text: trimmedLine,
          });
        }
      }
    }
  }

  return issues;
}

// Main
const htmlFiles = findHtmlFiles(LIB_ROOT);
let totalIssues = 0;

for (const file of htmlFiles) {
  const issues = findHardcodedStrings(file);
  if (issues.length > 0) {
    const relPath = path.relative(path.join(__dirname, '..'), file);
    for (const issue of issues) {
      console.log(`${relPath}:${issue.line}  warning  Hardcoded string: "${issue.text}"`);
    }
    totalIssues += issues.length;
  }
}

if (totalIssues > 0) {
  console.log(`\n⚠  Found ${totalIssues} potential hardcoded string(s) in templates.`);
  console.log('   Use interpolation with a labels/i18n pattern instead.');
  process.exit(1);
} else {
  console.log('✓ No hardcoded strings found in templates.');
  process.exit(0);
}
