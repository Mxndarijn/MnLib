#!/usr/bin/env bash
# Tests for pr-body-lines.py. Usage: bash .github/scripts/pr-body-lines.test.sh
set -u
count="python3 $(dirname "$0")/pr-body-lines.py"
fail=0
lines() { for i in $(seq "$1"); do echo "line $i"; done; }
t() { # name, expected count, body
  got=$(printf '%s' "$3" | $count)
  if [ "$got" = "$2" ]; then echo "ok   $1 ($got)"; else echo "FAIL $1: got $got, want $2"; fail=1; fi
}
t "empty body -> 0 (fail)" 0 ""
t "40-line body -> 40 (fail)" 40 "$(lines 40)"
t "template comment + short body -> 2 (pass)" 2 "<!-- Describe your change -->
Fixes login bug.
Tested locally."
t "one-line comment then 12 lines -> 13 (fail)" 13 "What: x
<!-- note -->
$(lines 12)"
t "multi-line comment" 2 "a
<!-- one
two
three -->
b"
t "inline details then 40 lines -> 41 (fail)" 41 "What: x
<details><summary>P</summary>ok</details>
$(lines 40)"
t "nested details 3+[5+[5]+8]+2 -> 5" 5 "$(lines 3)
<details><summary>outer</summary>
$(lines 5)
<details>
$(lines 5)
</details>
$(lines 8)
</details>
$(lines 2)"
t "details with attrs/case/spaced closer" 2 "a
<DETAILS class=x><summary>s</summary>
$(lines 20)
</details >
b"
t "unclosed details is counted" 22 "a
<details>
$(lines 20)"
t "only details/comment -> 0 (fail)" 0 "<!-- c -->
<details>
$(lines 5)
</details>"
t "CRLF body" 3 "$(printf 'a\r\n\r\nb\r\n  \r\nc\r\n')"
t "exactly 10 lines" 10 "$(lines 10)"
exit $fail
