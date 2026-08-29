#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

WORKFLOW="$(cd "$PWD/../.." && pwd)/.github/workflows/branch-name.yml"
workflow=$(cat "$WORKFLOW")

assert_contains "branch workflow uses the protected workflow event" "pull_request_target:" "$workflow"
assert_contains "branch workflow runs the protected base revision" "ref: \${{ github.event.pull_request.base.sha }}" "$workflow"
assert_contains "branch workflow uses the trusted submitted-head action" "uses: ./.github/actions/resolve-pull-request-head" "$workflow"
assert_contains "branch workflow passes the target branch to the submitted-head action" "base-ref: \${{ github.base_ref }}" "$workflow"
assert_contains "branch workflow passes the pull request number to the submitted-head action" "pull-request-number: \${{ github.event.pull_request.number }}" "$workflow"
assert_contains "branch workflow passes the immutable commit to the submitted-head action" "expected-head-sha: \${{ github.event.pull_request.head.sha }}" "$workflow"
assert_contains "branch workflow executes shared policy with the fixed ref" 'bash scripts/policy-suite.sh release-flow "origin/$BASE_REF" refs/substrate/pull-request-head "$HEAD_REF"' "$workflow"
assert_not_contains "branch workflow does not construct a source ref" 'refs/heads/$HEAD_REF' "$workflow"
assert_not_contains "branch workflow does not duplicate submitted-head fetching" "git fetch" "$workflow"
assert_not_contains "branch workflow does not duplicate submitted-head verification" "git rev-parse" "$workflow"
assert_not_contains "branch workflow does not check out submitted workflow code" "ref: \${{ github.event.pull_request.head.sha }}" "$workflow"

test_main
