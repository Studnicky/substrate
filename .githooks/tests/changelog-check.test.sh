#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

WORKFLOW="$(cd "$PWD/../.." && pwd)/.github/workflows/changelog-check.yml"
workflow=$(cat "$WORKFLOW")

assert_contains "ordinary PRs require changesets" "name: Verify a changeset was added" "$workflow"
assert_contains "ordinary PRs exclude prepared releases" "!startsWith(github.head_ref, 'release/prepare-')" "$workflow"
assert_contains "ordinary PRs target protected branches" "branches: [ main, develop ]" "$workflow"
assert_contains "ordinary PRs fetch their target" 'git fetch origin "$BASE_REF"' "$workflow"
assert_contains "ordinary PRs run changeset policy" "bash scripts/policy-suite.sh changeset-required" "$workflow"
assert_contains "prepared releases have a dedicated gate" "name: Verify prepared release assets" "$workflow"
assert_contains "prepared release branch selector" "startsWith(github.head_ref, 'release/prepare-')" "$workflow"
assert_contains "prepared releases use publish gates" "bash scripts/release-suite.sh publish-gates" "$workflow"
pass_count=$((pass_count + 1))

test_main
