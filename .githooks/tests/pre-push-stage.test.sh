#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

REPO_ROOT="$(cd "$PWD/../.." && pwd)"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  setup_pre_push_fixture "$repo" "$REPO_ROOT"

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"
  git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop
  git switch -q -c feature/staged-pre-push

  stub_pre_push_hook_suite "$repo" generated-artifacts

  printf '{"name":"@test/example"}\n' > packages/example/package.json
  git add -A
  git commit -q -m "feat: change package"
  local_sha=$(git rev-parse HEAD)

  if printf 'refs/heads/feature/staged-pre-push %s refs/heads/feature/staged-pre-push 0000000000000000000000000000000000000000\n' "$local_sha" | .githooks/pre-push >/tmp/pre-push-stage.out 2>&1; then
    fail "pre-push staged fail-fast" "pre-push succeeded despite generated-artifacts failure"
  fi

  assert_contains "pre-push policy ran" "generated-artifacts" "$(cat hook-suite.calls)"
  assert_contains "pre-push delivery pair" "release-gates origin/develop refs/heads/feature/staged-pre-push feature/staged-pre-push" "$(cat hook-suite.calls)"
  if grep -F -- "typecheck" hook-suite.calls >/dev/null 2>&1; then
    fail "pre-push validation skipped" "typecheck ran after policy stage failure"
  fi
  if grep -F -- "build" hook-suite.calls >/dev/null 2>&1; then
    fail "pre-push build skipped" "build ran after policy stage failure"
  fi
)
rm -rf "$repo"

repo=$(make_repo release/v1.0.0)
(
  cd "$repo" || exit 1
  setup_pre_push_fixture "$repo" "$REPO_ROOT"

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/main "$base_sha"
  git update-ref refs/remotes/origin/develop "$base_sha"

  stub_pre_push_hook_suite "$repo"

  printf '{"name":"@test/example"}\n' > packages/example/package.json
  git add -A
  git commit -q -m "feat: prepare release"
  local_sha=$(git rev-parse HEAD)

  if ! printf 'refs/heads/release/v1.0.0 %s refs/heads/release/v1.0.0 %s\n' "$local_sha" "$base_sha" | .githooks/pre-push >/tmp/pre-push-release-target.out 2>&1; then
    fail "pre-push release target" "$(cat /tmp/pre-push-release-target.out)"
  fi

  assert_contains "pre-push release pair" "release-gates origin/main refs/heads/release/v1.0.0 release/v1.0.0" "$(cat hook-suite.calls)"
)
rm -rf "$repo"

repo=$(make_repo feature/holding)
(
  cd "$repo" || exit 1
  setup_pre_push_fixture "$repo" "$REPO_ROOT"

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"
  git update-ref refs/remotes/origin/main "$base_sha"

  stub_pre_push_hook_suite "$repo"

  git switch -q -c feature/pushed
  printf '{"name":"@test/example"}\n' > packages/example/package.json
  git add packages/example/package.json
  git commit -q -m "feat: prepare pushed branch"
  pushed_sha=$(git rev-parse HEAD)

  git switch -q feature/holding
  if ! printf 'refs/heads/feature/pushed %s refs/heads/feature/pushed %s\n' "$pushed_sha" "$base_sha" | .githooks/pre-push >/tmp/pre-push-nonchecked.out 2>&1; then
    fail "pre-push non-checked branch" "$(cat /tmp/pre-push-nonchecked.out)"
  fi

  assert_contains "pre-push resolves non-checked branch" "release-gates origin/develop refs/heads/feature/pushed feature/pushed" "$(cat hook-suite.calls)"
)
rm -rf "$repo"

repo=$(make_repo feature/holding)
(
  cd "$repo" || exit 1
  setup_pre_push_fixture "$repo" "$REPO_ROOT"

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"

  stub_pre_push_hook_suite "$repo"

  git switch -q -c feature/first "$base_sha"
  printf '{"name":"@test/first"}\n' > packages/example/package.json
  git add packages/example/package.json
  git commit -q -m "feat: prepare first branch"
  first_sha=$(git rev-parse HEAD)

  git switch -q -c feature/second "$base_sha"
  mkdir -p packages/example
  printf '{"name":"@test/second"}\n' > packages/example/package.json
  git add packages/example/package.json
  git commit -q -m "feat: prepare second branch"
  second_sha=$(git rev-parse HEAD)

  if ! printf 'refs/heads/feature/first %s refs/heads/feature/first %s\nrefs/heads/feature/second %s refs/heads/feature/second %s\n' "$first_sha" "$base_sha" "$second_sha" "$base_sha" | .githooks/pre-push >/tmp/pre-push-multi-branch.out 2>&1; then
    fail "pre-push multi-branch" "$(cat /tmp/pre-push-multi-branch.out)"
  fi

  calls=$(cat hook-suite.calls)
  assert_contains "pre-push first branch gate" "release-gates origin/develop refs/heads/feature/first feature/first" "$calls"
  assert_contains "pre-push second branch gate" "release-gates origin/develop refs/heads/feature/second feature/second" "$calls"
)
rm -rf "$repo"

repo=$(make_repo feature/holding)
(
  cd "$repo" || exit 1
  setup_pre_push_fixture "$repo" "$REPO_ROOT"

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"

  stub_pre_push_hook_suite "$repo"

  unsafe_branch="feature/safe';touch\${IFS}hook-injected;#"
  if printf 'refs/heads/%s %s refs/heads/feature/safe %s\n' "$unsafe_branch" "$base_sha" "$base_sha" | .githooks/pre-push >/tmp/pre-push-unsafe-branch.out 2>&1; then
    fail "pre-push unsafe branch" "pre-push accepted an unsafe branch"
  fi

  assert_contains "pre-push unsafe branch rejection" "invalid branch name" "$(cat /tmp/pre-push-unsafe-branch.out)"
  [ ! -e hook-injected ] || fail "pre-push unsafe branch execution" "branch name executed a shell command"
  [ ! -e hook-suite.calls ] || fail "pre-push unsafe branch stage" "branch name reached a hook suite stage"
)
rm -rf "$repo"

repo=$(make_repo release/1.0.0)
(
  cd "$repo" || exit 1
  setup_pre_push_fixture "$repo" "$REPO_ROOT"

  stub_pre_push_hook_suite "$repo"

  local_sha=$(git rev-parse HEAD)
  if ! printf 'refs/tags/v1.0.0 %s refs/tags/v1.0.0 0000000000000000000000000000000000000000\n' "$local_sha" | .githooks/pre-push >/tmp/pre-push-tag.out 2>&1; then
    fail "pre-push tag-only" "$(cat /tmp/pre-push-tag.out)"
  fi

  assert_contains "tag-only unit tests" "test-unit" "$(cat hook-suite.calls)"
  assert_contains "tag-only integration tests" "test-integration" "$(cat hook-suite.calls)"
  assert_contains "tag-only smoke tests" "test-smoke" "$(cat hook-suite.calls)"
)
rm -rf "$repo"

# Branch policy reads the refs being pushed, not HEAD. Pushing a tag while the
# release branch is checked out on main must not be mistaken for pushing main.
repo=$(make_repo main)
(
  cd "$repo" || exit 1
  setup_pre_push_fixture "$repo" "$REPO_ROOT"

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"
  git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop

  stub_pre_push_hook_suite "$repo"

  if ! printf 'refs/tags/v2.0.0 %s refs/tags/v2.0.0 0000000000000000000000000000000000000000\n' "$base_sha" | .githooks/pre-push >/tmp/pre-push-tag-on-main.out 2>&1; then
    fail "tag push from main" "$(cat /tmp/pre-push-tag-on-main.out)"
  fi

  assert_not_contains "tag push is not treated as a main push" "protected branch" "$(cat /tmp/pre-push-tag-on-main.out)"
  assert_not_contains "tag push skips release gates" "release-gates" "$(cat hook-suite.calls)"
)
rm -rf "$repo"

# A branch push is still judged by the branch in the push, so main stays refused
# even when some other branch is checked out.
repo=$(make_repo feature/holding)
(
  cd "$repo" || exit 1
  setup_pre_push_fixture "$repo" "$REPO_ROOT"

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"
  git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop

  if printf 'refs/heads/main %s refs/heads/main 0000000000000000000000000000000000000000\n' "$base_sha" | .githooks/pre-push >/tmp/pre-push-main-ref.out 2>&1; then
    fail "main ref push refused" "pre-push allowed a push of refs/heads/main"
  fi

  assert_contains "main ref push names the protected branch" "protected branch 'main'" "$(cat /tmp/pre-push-main-ref.out)"
)
rm -rf "$repo"
