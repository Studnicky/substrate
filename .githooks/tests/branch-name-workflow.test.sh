#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

WORKFLOW="$(cd "$PWD/../.." && pwd)/.github/workflows/branch-name.yml"
workflow=$(cat "$WORKFLOW")

assert_contains "branch workflow uses the protected workflow event" "pull_request_target:" "$workflow"
assert_contains "branch workflow publishes the protected branch-name status" "name: Validate branch name" "$workflow"
assert_contains "branch workflow uses the pinned checkout action" "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1" "$workflow"
assert_contains "branch workflow verifies the trusted base revision" "name: Verify trusted base revision" "$workflow"
assert_contains "branch workflow receives the server base commit" "BASE_SHA: \${{ github.event.pull_request.base.sha }}" "$workflow"
assert_contains "branch workflow resolves the server base commit into a fixed ref" 'git fetch --no-tags origin "$BASE_SHA:refs/substrate/pull-request-base"' "$workflow"
assert_contains "branch workflow checks out the trusted base revision" "git checkout --detach refs/substrate/pull-request-base" "$workflow"
assert_contains "branch workflow verifies its checkout against the fixed base ref" 'git rev-parse --verify refs/substrate/pull-request-base' "$workflow"
assert_contains "branch workflow rejects a mismatched base checkout" "Checked-out base revision does not match the event base SHA" "$workflow"
assert_resolve_pull_request_head_action "branch workflow" "$workflow"
assert_before "branch workflow resolves the submitted head before detaching the base" "uses: ./.github/actions/resolve-pull-request-head" "git checkout --detach refs/substrate/pull-request-base" "$workflow"
assert_contains "branch workflow executes shared policy with the fixed ref" 'bash scripts/policy-suite.sh release-flow "origin/$BASE_REF" refs/substrate/pull-request-head "$HEAD_REF"' "$workflow"
assert_not_contains "branch workflow does not construct a source ref" 'refs/heads/$HEAD_REF' "$workflow"
assert_not_contains "branch workflow does not use a dynamic checkout ref" "ref: \${{ github.event.pull_request.base.sha }}" "$workflow"
