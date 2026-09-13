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
assert_contains "sync workflow accepts only the disposable sync source branch" "github.event.pull_request.head.ref == 'chore/sync-main-to-develop'" "$workflow"
assert_not_contains "sync workflow never uses main as a pull request head" "github.event.pull_request.head.ref == 'main'" "$workflow"
assert_contains "sync workflow accepts only the develop target branch" "github.event.pull_request.base.ref == 'develop'" "$workflow"
assert_not_contains "sync workflow does not trust the empty pull-request merge SHA" "github.event.pull_request.merge_commit_sha" "$workflow"
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
assert_contains "sync workflow can push the disposable branch" 'contents: write' "$workflow"
assert_contains "sync workflow creates the disposable branch from current main" 'git switch --force-create "$branch" origin/main' "$workflow"
assert_contains "sync workflow creates an explicit synchronization commit" 'git commit --allow-empty -m "chore: sync main to develop"' "$workflow"
assert_not_contains "sync workflow never rejects a stale disposable branch" 'does not contain the current main history' "$workflow"
assert_not_contains "sync workflow never validates disposable-branch ancestry" 'sync-ancestry origin/main "origin/$branch"' "$workflow"
assert_contains "sync workflow records the current remote branch tip" 'remote_branch_sha=$(git ls-remote --heads origin "refs/heads/$branch" | awk "{ print \$1 }")' "$workflow"
assert_contains "sync workflow lease-protects a stale branch replacement" 'git push --force-with-lease="refs/heads/$branch:$remote_branch_sha" origin "HEAD:refs/heads/$branch"' "$workflow"
assert_contains "sync workflow creates a previously absent disposable branch" 'git push origin "HEAD:refs/heads/$branch"' "$workflow"
assert_not_contains "sync workflow does not create a package changeset for a history-only backmerge" ".changeset/sync-main-to-develop.md" "$workflow"
assert_contains "sync workflow records the pushed head SHA" 'echo "sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"' "$workflow"
assert_contains "sync workflow passes the pushed head SHA to the merge step" 'SYNC_SHA: ${{ steps.branch.outputs.sha }}' "$workflow"
assert_not_contains "sync workflow does not request unsupported automatic merging" "--auto" "$workflow"
assert_contains "sync workflow waits for reported checks before a head-pinned direct merge" 'gh pr checks "$PR_NUMBER" --repo "$GITHUB_REPOSITORY" --watch --fail-fast' "$workflow"
assert_contains "sync workflow pins the direct merge to the pushed head" 'gh pr merge "$PR_NUMBER" --repo "$GITHUB_REPOSITORY" --merge --delete-branch --match-head-commit "$SYNC_SHA"' "$workflow"
assert_contains "sync workflow uses the disposable branch as the pull request head" '--head "$SYNC_BRANCH"' "$workflow"
