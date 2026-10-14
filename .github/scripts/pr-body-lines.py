#!/usr/bin/env python3
"""Count visible PR-body lines (RULES.md #12): stdin -> number of non-blank lines
outside HTML comments and closed <details> blocks (nested, inline, any attrs/case).
An unclosed <!-- hides the rest (as GitHub does); an unclosed <details> is counted."""
import re
import sys

body = sys.stdin.read().replace("\r\n", "\n").replace("\r", "\n")
body = re.sub(r"<!--.*?(?:-->|\Z)", "", body, flags=re.S)
# Remove innermost closed <details> blocks until none are left, so nesting works.
inner = re.compile(r"<details\b[^>]*>(?:(?!<details\b).)*?</details\s*>", re.S | re.I)
while True:
    body, n = inner.subn("", body)
    if not n:
        break
print(sum(1 for line in body.split("\n") if line.strip()))
