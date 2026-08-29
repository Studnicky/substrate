#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

RELEASE_WORKFLOW="$(cd "$PWD/../.." && pwd)/.github/workflows/release.yml"

workflow=$(cat "$RELEASE_WORKFLOW")

assert_contains "release workflow runs from completed CI" $'workflow_run:\n    workflows: [ ci ]\n    branches: [ main, develop ]\n    types: [ completed ]' "$workflow"
assert_contains "release planner checks out trusted main code" $'fetch-depth: 0\n          ref: main' "$workflow"
assert_not_contains "release planner does not check out an event branch" 'ref: ${{ github.event.workflow_run.head_branch }}' "$workflow"
assert_contains "release planner rejects unsuccessful or non-push runs" 'if [ "$WORKFLOW_RUN_CONCLUSION" != "success" ] || [ "$WORKFLOW_RUN_EVENT" != "push" ]; then' "$workflow"
assert_contains "release planner restricts trusted branches" $'case "$TRUSTED_BRANCH" in\n            develop|main)' "$workflow"
assert_contains "release planner fetches the validated branch" 'git fetch --no-tags origin "$TRUSTED_BRANCH"' "$workflow"
assert_contains "release planner resolves the remote target SHA" 'actual_sha=$(git rev-parse "origin/$TRUSTED_BRANCH")' "$workflow"
assert_contains "release planner checks the event SHA" 'if [ "$actual_sha" != "$TRUSTED_SHA" ]; then' "$workflow"
assert_contains "release planner detaches the verified target SHA" 'git checkout --detach "$actual_sha"' "$workflow"
