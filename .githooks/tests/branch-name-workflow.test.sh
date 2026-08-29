#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

WORKFLOW="$(cd "$PWD/../.." && pwd)/.github/workflows/branch-name.yml"
workflow=$(cat "$WORKFLOW")

assert_contains "branch workflow uses the protected workflow event" "pull_request_target:" "$workflow"
assert_contains "branch workflow runs the protected base revision" "ref: \${{ github.event.pull_request.base.sha }}" "$workflow"
assert_contains "branch workflow receives the submitted commit" "HEAD_SHA: \${{ github.event.pull_request.head.sha }}" "$workflow"
assert_contains "branch workflow receives the pull request number" "PR_NUMBER: \${{ github.event.pull_request.number }}" "$workflow"
assert_contains "branch workflow fetches its target" 'git fetch --no-tags origin "$BASE_REF"' "$workflow"
assert_contains "branch workflow fetches submitted code into a fixed ref" 'git fetch --no-tags origin "pull/$PR_NUMBER/head:refs/substrate/pull-request-head"' "$workflow"
assert_contains "branch workflow verifies the fixed ref against the event SHA" 'git rev-parse --verify refs/substrate/pull-request-head' "$workflow"
assert_contains "branch workflow rejects an unexpected submitted commit" '[ "$(git rev-parse --verify refs/substrate/pull-request-head)" != "$HEAD_SHA" ]' "$workflow"
assert_contains "branch workflow executes shared policy with the fixed ref" 'bash scripts/policy-suite.sh release-flow "origin/$BASE_REF" refs/substrate/pull-request-head "$HEAD_REF"' "$workflow"
assert_not_contains "branch workflow does not construct a source ref" 'refs/heads/$HEAD_REF' "$workflow"
assert_not_contains "branch workflow does not fetch submitted code by raw SHA" 'git fetch --no-tags origin "$HEAD_SHA"' "$workflow"
assert_not_contains "branch workflow does not check out submitted workflow code" "ref: \${{ github.event.pull_request.head.sha }}" "$workflow"
pass_count=$((pass_count + 11))

test_main
