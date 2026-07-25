#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

HOOK_SUITE="$(cd "$PWD/../.." && pwd)/scripts/hook-suite.sh"

assert_hook_suite_dispatches_shared_presets() {
  local repo out

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    stub_cmd "$repo" bash 'printf "%s\n" "$*"'
    stub_cmd "$repo" pnpm 'printf "%s\n" "$*"'
    mkdir -p .changeset

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" full)
    assert_contains "hook full suite" "scripts/ci-suite.sh generated-artifacts typecheck lint test-all build" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" typecheck)
    assert_contains "hook typecheck suite" "scripts/ci-suite.sh typecheck" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" test-unit)
    assert_contains "hook test unit suite" "scripts/ci-suite.sh test-unit" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" test-integration)
    assert_contains "hook test integration suite" "scripts/ci-suite.sh test-integration" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" test-smoke)
    assert_contains "hook test smoke suite" "scripts/ci-suite.sh test-smoke" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" test-all)
    assert_contains "hook test all suite" "scripts/ci-suite.sh test-all" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" generated-artifacts)
    assert_contains "hook generated suite" "scripts/ci-suite.sh generated-artifacts" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" config-schema-check)
    assert_contains "hook config schema suite" "scripts/ci-suite.sh config-schema-check" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" audit)
    assert_contains "hook audit suite" "scripts/ci-suite.sh audit" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" diagram origin/develop)
    assert_contains "hook diagram suite" "scripts/ci-suite.sh diagram-blast-radius" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" semgrep HEAD~1..HEAD)
    assert_contains "hook semgrep suite" "scripts/security-suite.sh semgrep-range HEAD~1..HEAD" "$out"

    out=$(PATH="$repo/bin:$PATH" /bin/bash "$HOOK_SUITE" release-gates origin/develop)
    assert_contains "hook release gates" "scripts/release-suite.sh changeset-status origin/develop" "$out"
  )
  rm -rf "$repo"
  pass_count=$((pass_count + 1))
}

assert_hook_suite_dispatches_shared_presets
test_main
