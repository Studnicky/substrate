#!/usr/bin/env bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

CHECKER="$(cd "$PWD/../.." && pwd)/scripts/check-docs-exports.mjs"
repo=$(mktemp -d)

cleanup() {
  rm -rf "$repo"
}
trap cleanup EXIT

mkdir -p "$repo/docs/packages" "$repo/packages/alpha/src/browser" "$repo/packages/alpha/src/candidate-sources" "$repo/packages/alpha/src/interfaces"
printf '%s\n' '{' '  "name": "@studnicky/alpha",' '  "exports": {' '    "./node": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },' '    "./browser": { "types": "./dist/browser/index.d.ts", "import": "./dist/browser/index.js" },' '    "./interfaces": { "types": "./dist/interfaces/index.d.ts", "import": "./dist/interfaces/index.js" },' '    "./candidate-sources": { "types": "./dist/candidate-sources/index.d.ts", "import": "./dist/candidate-sources/index.js" }' '  }' '}' > "$repo/packages/alpha/package.json"
printf '%s\n' '{}' > "$repo/packages/alpha/tsconfig.json"
printf '%s\n' "export type { SharedInterface } from './interfaces/index.js';" 'export const NodeOnly = true;' > "$repo/packages/alpha/src/index.ts"
printf '%s\n' 'export interface SharedInterface {}' > "$repo/packages/alpha/src/interfaces/index.ts"
printf '%s\n' 'export const BrowserOnly = true;' > "$repo/packages/alpha/src/browser/index.ts"
printf '%s\n' 'export const CandidateSource = true;' > "$repo/packages/alpha/src/candidate-sources/index.ts"

write_valid_docs() {
  printf '%s\n' '# Alpha' '' '## Exports' '' '| Symbol | Purpose | Import path |' '| --- | --- | --- |' '| SharedInterface | Shared contract | @studnicky/alpha/interfaces |' '| NodeOnly | Node runtime API | @studnicky/alpha/node |' '| BrowserOnly | Browser runtime API | @studnicky/alpha/browser |' > "$repo/docs/packages/alpha.md"
}

write_valid_docs
out=$(node "$CHECKER" --root "$repo")
assert_contains "canonical neutral and browser-only rows pass" "check-docs-exports: OK" "$out"
assert_not_contains "arbitrary feature paths do not require table rows" "CandidateSource" "$out"

perl -0pi -e 's#\@studnicky/alpha/interfaces#\@studnicky/alpha/node#' "$repo/docs/packages/alpha.md"
if out=$(node "$CHECKER" --root "$repo" 2>&1); then
  fail "node row for neutral symbol fails canonical completeness" "checker exited successfully"
fi
assert_contains "neutral symbol requires neutral import path" "SharedInterface must use @studnicky/alpha/interfaces in the Exports table." "$out"
assert_not_contains "node row stays directly valid" "SharedInterface is not exported by @studnicky/alpha/node." "$out"

write_valid_docs
out=$(node "$CHECKER" --root "$repo")
assert_contains "restored canonical documentation passes" "check-docs-exports: OK" "$out"
