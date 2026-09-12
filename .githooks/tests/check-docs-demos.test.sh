#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

CHECKER="$(cd "$PWD/../.." && pwd)/scripts/check-docs-demos.mjs"
repo=$(mktemp -d)

cleanup() {
  rm -rf "$repo"
}
trap cleanup EXIT

mkdir -p "$repo/docs/packages" "$repo/packages/alpha/examples" "$repo/packages/beta/examples" "$repo/packages/context/examples"
printf "%s\n" "{\"name\":\"@test/alpha\"}" > "$repo/packages/alpha/package.json"
printf "%s\n" "{\"name\":\"@test/beta\"}" > "$repo/packages/beta/package.json"
printf "%s\n" "{\"name\":\"@test/context\"}" > "$repo/packages/context/package.json"
printf "%s\n" "export {};" > "$repo/packages/alpha/examples/basic.ts"
printf "%s\n" "export {};" > "$repo/packages/beta/examples/basic.ts"
printf "%s\n" "export {};" > "$repo/packages/context/examples/browser.ts"
printf "%s\n" "<RunnableExample src=\"packages/alpha/examples/basic\" />" > "$repo/docs/packages/alpha.md"
printf "%s\n" "<RunnableExample src=\"packages/beta/examples/basic\" />" > "$repo/docs/packages/beta.md"
printf "%s\n" "<RunnableExample src=\"packages/context/examples/browser\" />" > "$repo/docs/packages/context.md"

out=$(node "$CHECKER" --root "$repo")
assert_contains "valid consumer package demos pass" "OK (3 consumer package page(s) declare a runnable demo)" "$out"

printf "%s\n" "# Context" > "$repo/docs/packages/context.md"
if out=$(node "$CHECKER" --root "$repo" 2>&1); then
  fail "missing Context runnable demo fails" "checker exited successfully"
fi
assert_contains "missing Context demo identifies package page" "docs/packages/context.md is missing a <RunnableExample> consumer demo." "$out"

printf "%s\n" "<RunnableExample src=\"packages/alpha/examples/basic\" />" > "$repo/docs/packages/context.md"
if out=$(node "$CHECKER" --root "$repo" 2>&1); then
  fail "foreign Context runnable demo fails" "checker exited successfully"
fi
assert_contains "foreign Context demo identifies package page" "docs/packages/context.md must reference an existing packages/context/examples/*.ts source" "$out"
printf "%s\n" "<RunnableExample src=\"packages/context/examples/browser\" />" > "$repo/docs/packages/context.md"

printf "%s\n" "# Beta" > "$repo/docs/packages/beta.md"
if out=$(node "$CHECKER" --root "$repo" 2>&1); then
  fail "missing runnable demo fails" "checker exited successfully"
fi
assert_contains "missing demo identifies package page" "docs/packages/beta.md is missing a <RunnableExample> consumer demo." "$out"

printf "%s\n" "<RunnableExample src=\"packages/alpha/examples/basic\" />" > "$repo/docs/packages/beta.md"
if out=$(node "$CHECKER" --root "$repo" 2>&1); then
  fail "foreign runnable demo fails" "checker exited successfully"
fi
assert_contains "foreign demo identifies package page" "docs/packages/beta.md must reference an existing packages/beta/examples/*.ts source" "$out"
