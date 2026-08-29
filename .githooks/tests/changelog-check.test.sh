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
assert_contains "lifecycle gate receives the pull request number" "PR_NUMBER: \${{ github.event.pull_request.number }}" "$workflow"
assert_contains "lifecycle gate receives the head commit" "HEAD_SHA: \${{ github.event.pull_request.head.sha }}" "$workflow"
assert_contains "lifecycle gate fetches its target" 'git fetch --no-tags origin "$BASE_REF"' "$workflow"
assert_contains "lifecycle gate fetches the submitted pull request into a fixed ref" 'git fetch --no-tags origin "pull/$PR_NUMBER/head:refs/substrate/pull-request-head"' "$workflow"
assert_contains "lifecycle gate verifies the fixed ref against the event SHA" 'git rev-parse --verify refs/substrate/pull-request-head' "$workflow"
assert_contains "lifecycle gate rejects an unexpected submitted commit" '[ "$(git rev-parse --verify refs/substrate/pull-request-head)" != "$HEAD_SHA" ]' "$workflow"
assert_contains "lifecycle gate validates the source branch after committing its inspection ref" 'bash scripts/policy-suite.sh branch "$HEAD_REF"' "$workflow"
assert_contains "lifecycle gate uses shared route" 'bash scripts/policy-suite.sh release-flow "origin/$BASE_REF" refs/substrate/pull-request-head "$HEAD_REF"' "$workflow"
assert_not_contains "lifecycle gate does not construct a ref from the source branch" 'refs/heads/$HEAD_REF' "$workflow"
assert_not_contains "lifecycle gate does not fetch submitted code by raw SHA" 'git fetch --no-tags origin "$HEAD_SHA"' "$workflow"
assert_not_contains "lifecycle gate does not check out submitted workflow code" "ref: \${{ github.event.pull_request.head.sha }}" "$workflow"
assert_not_contains "workflow does not split lifecycle routing" "if: \${{ startsWith" "$workflow"
assert_not_contains "workflow does not duplicate release gates" "scripts/release-suite.sh" "$workflow"
assert_not_contains "workflow does not exempt automation actors" "dependabot[bot]" "$workflow"
pass_count=$((pass_count + 21))

test_main
