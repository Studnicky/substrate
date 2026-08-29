#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

WORKFLOW="$(cd "$PWD/../.." && pwd)/.github/workflows/changelog-check.yml"
workflow=$(cat "$WORKFLOW")

assert_contains "PR checks use the protected workflow event" "pull_request_target:" "$workflow"
assert_contains "PR checks run the protected base revision" "ref: \${{ github.event.pull_request.base.sha }}" "$workflow"
assert_contains "PR checks target protected branches" "branches: [ main, develop ]" "$workflow"
assert_contains "PR checks have read-only repository access" $'permissions:\n      contents: read' "$workflow"
assert_contains "lifecycle gate names its route" "name: Validate branch route and release state" "$workflow"
assert_contains "lifecycle gate receives the target" "BASE_REF: \${{ github.base_ref }}" "$workflow"
assert_contains "lifecycle gate receives the head" "HEAD_REF: \${{ github.head_ref }}" "$workflow"
assert_contains "lifecycle gate uses the trusted submitted-head action" "uses: ./.github/actions/resolve-pull-request-head" "$workflow"
assert_contains "lifecycle gate passes the target branch to the submitted-head action" "base-ref: \${{ github.base_ref }}" "$workflow"
assert_contains "lifecycle gate passes the pull request number to the submitted-head action" "pull-request-number: \${{ github.event.pull_request.number }}" "$workflow"
assert_contains "lifecycle gate passes the immutable commit to the submitted-head action" "expected-head-sha: \${{ github.event.pull_request.head.sha }}" "$workflow"
assert_contains "lifecycle gate validates the source branch" 'bash scripts/policy-suite.sh branch "$HEAD_REF"' "$workflow"
assert_contains "lifecycle gate uses shared route" 'bash scripts/policy-suite.sh release-flow "origin/$BASE_REF" refs/substrate/pull-request-head "$HEAD_REF"' "$workflow"
assert_not_contains "lifecycle gate does not construct a ref from the source branch" 'refs/heads/$HEAD_REF' "$workflow"
assert_not_contains "lifecycle gate does not duplicate submitted-head fetching" "git fetch" "$workflow"
assert_not_contains "lifecycle gate does not duplicate submitted-head verification" "git rev-parse" "$workflow"
assert_not_contains "lifecycle gate does not check out submitted workflow code" "ref: \${{ github.event.pull_request.head.sha }}" "$workflow"
assert_not_contains "workflow does not split lifecycle routing" "if: \${{ startsWith" "$workflow"
assert_not_contains "workflow does not duplicate release gates" "scripts/release-suite.sh" "$workflow"
assert_not_contains "workflow does not exempt automation actors" "dependabot[bot]" "$workflow"

test_main
