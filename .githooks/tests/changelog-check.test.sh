#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

WORKFLOW="$(cd "$PWD/../.." && pwd)/.github/workflows/changelog-check.yml"
workflow=$(cat "$WORKFLOW")

assert_contains "PR checks use the protected workflow event" "pull_request_target:" "$workflow"
assert_contains "PR checks use the pinned checkout action" "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1" "$workflow"
assert_contains "PR checks verify the trusted base revision" "name: Verify trusted base revision" "$workflow"
assert_contains "PR checks receive the server base commit" "BASE_SHA: \${{ github.event.pull_request.base.sha }}" "$workflow"
assert_contains "PR checks resolve the server base commit into a fixed ref" 'git fetch --no-tags origin "$BASE_SHA:refs/substrate/pull-request-base"' "$workflow"
assert_contains "PR checks verify their checkout against the fixed base ref" 'git rev-parse --verify refs/substrate/pull-request-base' "$workflow"
assert_contains "PR checks reject a mismatched base checkout" "Checked-out base revision does not match the event base SHA" "$workflow"
assert_contains "PR checks target protected branches" "branches: [ main, develop ]" "$workflow"
assert_contains "PR checks have read-only repository access" $'permissions:\n      contents: read' "$workflow"
assert_contains "lifecycle gate names its route" "name: Validate branch route and release state" "$workflow"
assert_contains "lifecycle gate receives the target" "BASE_REF: \${{ github.base_ref }}" "$workflow"
assert_contains "lifecycle gate receives the head" "HEAD_REF: \${{ github.head_ref }}" "$workflow"
assert_resolve_pull_request_head_action "lifecycle gate" "$workflow"
assert_contains "lifecycle gate validates the source branch" 'bash scripts/policy-suite.sh branch "$HEAD_REF"' "$workflow"
assert_contains "lifecycle gate uses shared route" 'bash scripts/policy-suite.sh release-flow "origin/$BASE_REF" refs/substrate/pull-request-head "$HEAD_REF"' "$workflow"
assert_not_contains "lifecycle gate does not construct a ref from the source branch" 'refs/heads/$HEAD_REF' "$workflow"
assert_not_contains "lifecycle gate does not use a dynamic checkout ref" "ref: \${{ github.event.pull_request.base.sha }}" "$workflow"
assert_not_contains "workflow does not split lifecycle routing" "if: \${{ startsWith" "$workflow"
assert_not_contains "workflow does not duplicate release gates" "scripts/release-suite.sh" "$workflow"
assert_not_contains "workflow does not exempt automation actors" "dependabot[bot]" "$workflow"
