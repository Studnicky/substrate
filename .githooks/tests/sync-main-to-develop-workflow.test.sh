#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

SYNC_WORKFLOW="$(cd "$PWD/../.." && pwd)/.github/workflows/sync-main-to-develop.yml"

workflow=$(cat "$SYNC_WORKFLOW")

assert_contains "sync workflow observes pull request lifecycle events" $'pull_request:\n    branches: [ develop ]\n    types: [ opened, reopened, synchronize, closed ]' "$workflow"
assert_contains "sync workflow exposes a stable required-check name" $'verify-backmerge-source:\n    name: Validate canonical backmerge' "$workflow"
assert_contains "sync workflow accepts only this repository main" "github.event.pull_request.head.repo.full_name == github.repository" "$workflow"
assert_contains "sync workflow accepts only the main source branch" "github.event.pull_request.head.ref == 'main'" "$workflow"
assert_contains "sync workflow accepts only the develop target branch" "github.event.pull_request.base.ref == 'develop'" "$workflow"
assert_contains "sync workflow checks the server merge test result" 'MERGE_TEST_SHA: ${{ github.event.pull_request.merge_commit_sha }}' "$workflow"
assert_contains "sync workflow fetches the server merge test result" 'refs/pull/${PR_NUMBER}/merge:refs/substrate/backmerge-merge-test' "$workflow"
assert_contains "sync workflow checks out trusted develop code" 'ref: develop' "$workflow"
assert_not_contains "sync workflow does not check out the pull request head" 'ref: ${{ github.event.pull_request.head.sha }}' "$workflow"
assert_not_contains "sync workflow does not check out the merge result" 'ref: ${{ github.event.pull_request.merge_commit_sha }}' "$workflow"
assert_contains "sync workflow validates pre-merge ancestry through the release suite" 'verify-backmerge-result origin/main refs/substrate/backmerge-merge-test' "$workflow"
assert_contains "sync workflow validates post-merge ancestry through the release suite" 'verify-backmerge-result origin/main origin/develop' "$workflow"
assert_not_contains "sync workflow keeps ancestry logic in the release suite" 'git merge-base --is-ancestor' "$workflow"
assert_contains "sync workflow scopes the synchronizer to main pushes" "github.ref == 'refs/heads/main'" "$workflow"
assert_contains "sync workflow waits for post-merge validation" 'needs: [ verify-merged-backmerge ]' "$workflow"
assert_contains "sync workflow recovers a failed merged backmerge" "github.event.action == 'closed' && needs.verify-merged-backmerge.result == 'failure'" "$workflow"
assert_contains "sync workflow runs after a failed dependency" 'if: always() &&' "$workflow"
