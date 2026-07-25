#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

REPO_ROOT="$(cd "$PWD/../.." && pwd)"
TEST_SUITE="$REPO_ROOT/scripts/test-suite.mjs"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p scripts packages/foo/tests/unit packages/foo/tests/integration packages/foo/tests/smoke packages/bar/tests/unit

  cp "$TEST_SUITE" scripts/test-suite.mjs

  cat > package.json <<'JSON'
{"name":"@test/repo","private":true,"workspaces":["packages/*"]}
JSON

  printf '%s\n' '{"name":"@test/foo"}' > packages/foo/package.json
  printf '%s\n' '{"name":"@test/bar"}' > packages/bar/package.json
  : > packages/foo/tests/unit/foo.test.ts
  : > packages/foo/tests/integration/foo.test.ts
  : > packages/foo/tests/smoke/foo.test.ts
  : > packages/bar/tests/unit/bar.test.ts

  out=$(node scripts/test-suite.mjs all --dry-run)
  assert_contains "runner unit tier" "unit:" "$out"
  assert_contains "runner integration tier" "integration:" "$out"
  assert_contains "runner smoke tier" "smoke:" "$out"
  assert_contains "runner unit file" "packages/foo/tests/unit/foo.test.ts" "$out"
  assert_contains "runner integration file" "packages/foo/tests/integration/foo.test.ts" "$out"
  assert_contains "runner smoke file" "packages/foo/tests/smoke/foo.test.ts" "$out"

  out=$(node scripts/test-suite.mjs all --package @test/foo --dry-run)
  assert_contains "runner package filter" "packages/foo/tests/unit/foo.test.ts" "$out"
  assert_not_contains "runner package filter excludes sibling" "packages/bar/tests/unit/bar.test.ts" "$out"

  out=$(node scripts/test-suite.mjs unit --package packages/foo --dry-run)
  assert_contains "runner dir filter" "packages/foo/tests/unit/foo.test.ts" "$out"
  assert_not_contains "runner dir filter excludes sibling" "packages/bar/tests/unit/bar.test.ts" "$out"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

test_main
