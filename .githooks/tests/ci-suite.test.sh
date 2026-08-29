#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

CI_SUITE="$(cd "$PWD/../.." && pwd)/scripts/ci-suite.sh"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  stub_cmd "$repo" pnpm 'printf "%s\n" "$*"'
  out=$(PATH="$repo/bin:$PATH" bash "$CI_SUITE" audit)
  assert_contains "ci audit" "audit --prod --audit-level high" "$out"

  out=$(PATH="$repo/bin:$PATH" bash "$CI_SUITE" generated-artifacts)
  assert_contains "ci generated config schema" "run config-schema:check" "$out"
  assert_contains "ci generated stamp" "run stamp-version:check" "$out"
  assert_contains "ci generated diagram" "run diagram:deps:check" "$out"

  out=$(PATH="$repo/bin:$PATH" bash "$CI_SUITE" config-schema-check)
  assert_contains "ci config schema" "run config-schema:check" "$out"

  out=$(PATH="$repo/bin:$PATH" bash "$CI_SUITE" test)
  assert_contains "ci test alias" "run test:unit" "$out"

  out=$(PATH="$repo/bin:$PATH" bash "$CI_SUITE" test-unit test-integration test-smoke test-all)
  assert_contains "ci test unit" "run test:unit" "$out"
  assert_contains "ci test integration" "run test:integration" "$out"
  assert_contains "ci test smoke" "run test:smoke" "$out"
  assert_contains "ci test all" "run test:all" "$out"
)
rm -rf "$repo"
test_main
