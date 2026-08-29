#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

WORKFLOW="$(cd "$PWD/../.." && pwd)/.github/workflows/changelog-check.yml"
workflow=$(cat "$WORKFLOW")

assert_contains "PR checks use the contributor head" "ref: \${{ github.event.pull_request.head.sha }}" "$workflow"
assert_contains "PR checks target protected branches" "branches: [ main, develop ]" "$workflow"
assert_contains "PR checks have read-only repository access" $'permissions:\n      contents: read' "$workflow"
assert_contains "lifecycle gate names its route" "name: Validate branch route and release state" "$workflow"
assert_contains "lifecycle gate receives the target" "BASE_REF: \${{ github.base_ref }}" "$workflow"
assert_contains "lifecycle gate receives the head" "HEAD_REF: \${{ github.head_ref }}" "$workflow"
assert_contains "lifecycle gate receives the head commit" "HEAD_SHA: \${{ github.event.pull_request.head.sha }}" "$workflow"
assert_contains "lifecycle gate validates the source branch before use" 'bash scripts/policy-suite.sh branch "$HEAD_REF"' "$workflow"
assert_contains "lifecycle gate fetches its target" 'git fetch origin "$BASE_REF"' "$workflow"
assert_contains "lifecycle gate records the checked-out head at a fixed ref" 'git update-ref refs/substrate/pull-request-head "$HEAD_SHA"' "$workflow"
assert_contains "lifecycle gate uses shared route" 'bash scripts/policy-suite.sh release-flow "origin/$BASE_REF" refs/substrate/pull-request-head "$HEAD_REF"' "$workflow"
assert_not_contains "lifecycle gate does not construct a ref from the source branch" 'refs/heads/$HEAD_REF' "$workflow"
assert_not_contains "workflow does not split lifecycle routing" "if: \${{ startsWith" "$workflow"
assert_not_contains "workflow does not duplicate release gates" "scripts/release-suite.sh" "$workflow"
assert_not_contains "workflow does not exempt automation actors" "dependabot[bot]" "$workflow"
pass_count=$((pass_count + 15))

test_main
