#!/usr/bin/env bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

CHECKER="$(cd "$PWD/../.." && pwd)/scripts/check-browser-entrypoints.mjs"
repo=$(mktemp -d)

cleanup() {
  rm -rf "$repo"
}
trap cleanup EXIT

mkdir -p "$repo/packages/alpha/src"

write_valid_manifest() {
  printf "%s\n" "{" "  \"name\": \"@studnicky/alpha\"," "  \"exports\": {" "    \"./node\": { \"types\": \"./dist/index.d.ts\", \"import\": \"./dist/index.js\" }," "    \"./browser\": { \"types\": \"./dist/index.d.ts\", \"import\": \"./dist/index.js\" }," "    \"./interfaces\": { \"types\": \"./dist/interfaces/index.d.ts\", \"import\": \"./dist/interfaces/index.js\" }" "  }" "}" > "$repo/packages/alpha/package.json"
}

write_valid_manifest
printf "%s\n" "import type { Shared } from \"@studnicky/beta/interfaces\";" "export type Alpha = Shared;" > "$repo/packages/alpha/src/index.ts"
out=$(node "$CHECKER" --root "$repo" --validate-only)
assert_contains "valid node browser exports pass" "runtime-exports: OK (1 package(s), 1 browser entrypoint(s))" "$out"

mkdir -p "$repo/packages/alpha/src/interfaces"
printf "%s\n" "export interface AlphaInterface {}" > "$repo/packages/alpha/src/interfaces/index.ts"
printf "%s\n" "{\"name\":\"@studnicky/alpha\",\"exports\":{\"./node\":{\"types\":\"./dist/index.d.ts\",\"import\":\"./dist/index.js\"},\"./browser\":{\"types\":\"./dist/index.d.ts\",\"import\":\"./dist/index.js\"}}}" > "$repo/packages/alpha/package.json"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "neutral source feature export fails" "checker exited successfully"
fi
assert_contains "missing neutral source feature export is identified" "@studnicky/alpha src/interfaces/index.ts requires a ./interfaces export" "$out"
write_valid_manifest
printf "%s\n" "{" "  \"name\": \"@studnicky/alpha\", " "  \"exports\": {" "    \"./node\": { \"types\": \"./dist/index.d.ts\", \"import\": \"./dist/index.js\" }," "    \"./node/interfaces\": { \"types\": \"./dist/interfaces/index.d.ts\", \"import\": \"./dist/interfaces/index.js\" }," "    \"./browser\": { \"types\": \"./dist/index.d.ts\", \"import\": \"./dist/index.js\" }" "  }" "}" > "$repo/packages/alpha/package.json"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "runtime-namespaced feature export fails" "checker exited successfully"
fi
assert_contains "runtime-namespaced neutral feature export is identified" "@studnicky/alpha ./node/interfaces must use the package-level ./interfaces export" "$out"

mkdir -p "$repo/packages/alpha/src/browser" "$repo/packages/alpha/src/node"
printf "%s\n" "export const transform = () => undefined;" > "$repo/packages/alpha/src/browser/transform.ts"
printf "%s\n" "export const transform = () => undefined;" > "$repo/packages/alpha/src/node/transform.ts"
printf "%s\n" "{\"name\":\"@studnicky/alpha\",\"exports\":{\"./node\":{\"types\":\"./dist/index.d.ts\",\"import\":\"./dist/index.js\"},\"./browser\":{\"types\":\"./dist/index.d.ts\",\"import\":\"./dist/index.js\"},\"./interfaces\":{\"types\":\"./dist/interfaces/index.d.ts\",\"import\":\"./dist/interfaces/index.js\"},\"./node/transform\":{\"types\":\"./dist/node/transform.d.ts\",\"import\":\"./dist/node/transform.js\"},\"./browser/transform\":{\"types\":\"./dist/browser/transform.d.ts\",\"import\":\"./dist/browser/transform.js\"}}}" > "$repo/packages/alpha/package.json"
out=$(node "$CHECKER" --root "$repo" --validate-only)
assert_contains "symmetric runtime feature exports pass" "runtime-exports: OK (1 package(s), 2 browser entrypoint(s))" "$out"

printf "%s\n" "{\"name\":\"@studnicky/alpha\",\"exports\":{\"./node\":{\"types\":\"./dist/index.d.ts\",\"import\":\"./dist/index.js\"},\"./browser\":{\"types\":\"./dist/index.d.ts\",\"import\":\"./dist/index.js\"},\"./interfaces\":{\"types\":\"./dist/interfaces/index.d.ts\",\"import\":\"./dist/interfaces/index.js\"},\"./node/transform\":{\"types\":\"./dist/node/transform.d.ts\",\"import\":\"./dist/node/transform.js\"}}}" > "$repo/packages/alpha/package.json"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "node runtime feature without browser counterpart fails" "checker exited successfully"
fi
assert_contains "node runtime feature orphan is identified" "@studnicky/alpha ./node/transform requires matching ./browser/transform runtime feature export" "$out"

printf "%s\n" "{\"name\":\"@studnicky/alpha\",\"exports\":{\"./node\":{\"types\":\"./dist/index.d.ts\",\"import\":\"./dist/index.js\"},\"./browser\":{\"types\":\"./dist/index.d.ts\",\"import\":\"./dist/index.js\"},\"./interfaces\":{\"types\":\"./dist/interfaces/index.d.ts\",\"import\":\"./dist/interfaces/index.js\"},\"./browser/transform\":{\"types\":\"./dist/browser/transform.d.ts\",\"import\":\"./dist/browser/transform.js\"}}}" > "$repo/packages/alpha/package.json"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "browser runtime feature without node counterpart fails" "checker exited successfully"
fi
assert_contains "browser runtime feature orphan is identified" "@studnicky/alpha ./browser/transform requires matching ./node/transform runtime feature export" "$out"

printf "%s\n" "{" "  \"name\": \"@studnicky/alpha\"," "  \"exports\": {" "    \".\": { \"types\": \"./dist/index.d.ts\", \"import\": \"./dist/index.js\" }," "    \"./node\": { \"types\": \"./dist/index.d.ts\", \"import\": \"./dist/index.js\" }" "  }" "}" > "$repo/packages/alpha/package.json"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "root export fails" "checker exited successfully"
fi
assert_contains "root export is identified" "@studnicky/alpha must not declare a root export" "$out"

printf "%s\n" "{ \"name\": \"@studnicky/alpha\", \"exports\": {} }" > "$repo/packages/alpha/package.json"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "missing node export fails" "checker exited successfully"
fi
assert_contains "missing node export is identified" "@studnicky/alpha ./node must declare import and types targets" "$out"

printf "%s\n" "{" "  \"name\": \"@studnicky/alpha\"," "  \"exports\": {" "    \"./node\": { \"types\": \"./dist/index.d.ts\", \"import\": \"./dist/index.js\" }," "    \"./browser\": { \"types\": \"./dist/browser/index.d.ts\", \"import\": \"./dist/index.js\" }" "  }" "}" > "$repo/packages/alpha/package.json"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "portable alias type divergence fails" "checker exited successfully"
fi
assert_contains "portable alias type divergence is identified" "@studnicky/alpha ./node and ./browser share ./dist/index.js but declare different type artifacts" "$out"

write_valid_manifest
printf "%s\n" "import type { Shared } from \"@studnicky/beta\";" "export type Alpha = Shared;" > "$repo/packages/alpha/src/index.ts"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "bare package import fails" "checker exited successfully"
fi
assert_contains "bare package import is identified" "packages/alpha/src/index.ts:1:29 imports @studnicky/beta without /node or /browser" "$out"

printf "%s\n" "export type { Shared } from \"@studnicky/beta\";" > "$repo/packages/alpha/src/index.ts"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "bare package export fails" "checker exited successfully"
fi
assert_contains "bare package export is identified" "imports @studnicky/beta without /node or /browser" "$out"

printf "%s\n" "type Shared = import(\"@studnicky/beta\").Shared;" > "$repo/packages/alpha/src/index.ts"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "bare import type fails" "checker exited successfully"
fi
assert_contains "bare import type is identified" "imports @studnicky/beta without /node or /browser" "$out"

write_valid_manifest
printf "%s\n" "export const marker = 'node:fs'; // import from node:fs" > "$repo/packages/alpha/src/index.ts"
out=$(node "$CHECKER" --root "$repo")
assert_contains "node builtin text does not fail emitted-module inspection" "runtime-exports: OK (1 package(s), 1 browser entrypoint(s))" "$out"

printf "%s\n" "export { readFile } from 'node:fs';" > "$repo/packages/alpha/src/index.ts"
if out=$(node "$CHECKER" --root "$repo" 2>&1); then
  fail "browser entrypoint with node builtin fails" "checker exited successfully"
fi
assert_contains "emitted node builtin is identified" "@studnicky/alpha browser entrypoint includes Node builtin node:fs" "$out"

mkdir -p "$repo/packages/beta/src"
printf "%s\n" "{\"name\":\"@studnicky/beta\",\"exports\":{\"./node\":{\"types\":\"./dist/index.d.ts\",\"import\":\"./dist/index.js\"},\"./browser\":{\"types\":\"./dist/index.d.ts\",\"import\":\"./dist/index.js\"}}}" > "$repo/packages/beta/package.json"
printf "%s\n" "export const X = 1;" > "$repo/packages/beta/src/index.ts"

write_valid_manifest
printf "%s\n" "import { X } from \"@studnicky/beta/node\";" "export const y = X;" > "$repo/packages/alpha/src/index.ts"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "browser-reachable /node import fails" "checker exited successfully"
fi
assert_contains "browser-reachable /node import names the specifier and importing file" "@studnicky/alpha browser graph imports @studnicky/beta/node (a Node-only export) at packages/alpha/src/index.ts:1:19" "$out"

rm -rf "$repo/packages/alpha/src/interfaces"
mkdir -p "$repo/packages/alpha/src/node" "$repo/packages/alpha/src/browser"
printf "%s\n" "{\"name\":\"@studnicky/alpha\",\"exports\":{\"./node\":{\"types\":\"./dist/node/index.d.ts\",\"import\":\"./dist/node/index.js\"},\"./browser\":{\"types\":\"./dist/browser/index.d.ts\",\"import\":\"./dist/browser/index.js\"}}}" > "$repo/packages/alpha/package.json"
printf "%s\n" "import { X } from \"@studnicky/beta/node\";" "export const y = X;" > "$repo/packages/alpha/src/node/index.ts"
printf "%s\n" "export const y = 1;" > "$repo/packages/alpha/src/browser/index.ts"
out=$(node "$CHECKER" --root "$repo" --validate-only)
assert_contains "node-only-reachable /node import passes" "runtime-exports: OK (2 package(s), 2 browser entrypoint(s))" "$out"

write_valid_manifest
printf "%s\n" "import { Ajv2020 } from \"ajv/dist/2020.js\";" "export const y = new Ajv2020({});" > "$repo/packages/alpha/src/index.ts"
if out=$(node "$CHECKER" --root "$repo" --validate-only 2>&1); then
  fail "browser-reachable runtime code construction fails" "checker exited successfully"
fi
assert_contains "runtime code construction names the specifier and importing file" "@studnicky/alpha browser graph imports ajv/dist/2020.js (constructs code at runtime) at packages/alpha/src/index.ts:1:25" "$out"
