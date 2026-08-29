#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/rebase-check.sh
source "../lib/rebase-check.sh"

rebase_base_for_branch "release/1.2" develop >/dev/null
push_has_gatable_ref develop <<EOF
refs/heads/feature/x 123 refs/heads/feature/x 0
EOF
pass_count=$((pass_count + 2))

assert_leaked_main_commits_detected() {
  local repo

  repo=$(mktemp -d)
  (
    cd "$repo" || exit 1
    git init -q -b main
    git config user.email test@example.com
    git config user.name Test
    echo base > README.md
    git add README.md
    git commit -q -m base

    git update-ref refs/remotes/origin/main HEAD
    git branch -q develop
    git update-ref refs/remotes/origin/develop HEAD

    # main diverges with a commit develop never absorbs — this is the
    # release-prep-style content that must not leak into a develop-bound branch.
    echo "release only" >> README.md
    git add README.md
    git commit -q -m "chore(release): prepare vX.Y.Z"
    git update-ref refs/remotes/origin/main HEAD

    # A branch cut from origin/main after that carries the leaked commit.
    git checkout -q -b feature/from-main refs/remotes/origin/main
    if check_no_leaked_main_commits HEAD "refs/heads/feature/from-main" >/tmp/leak-out 2>&1; then
      fail "leaked main commits" "expected failure for a branch cut from main, got success"
    fi
    assert_contains "leaked main commits message" "hasn't absorbed yet" "$(cat /tmp/leak-out)"

    # A branch cut from origin/develop (never touching main's extra commit) passes clean.
    git checkout -q -b feature/from-develop refs/remotes/origin/develop
    if ! check_no_leaked_main_commits HEAD "refs/heads/feature/from-develop"; then
      fail "clean branch from develop" "expected success for a branch cut from develop"
    fi

    # Once main is an ancestor of develop again (post-sync), nothing can leak.
    git update-ref refs/remotes/origin/develop refs/remotes/origin/main
    git checkout -q -b feature/after-sync refs/remotes/origin/main
    if ! check_no_leaked_main_commits HEAD "refs/heads/feature/after-sync"; then
      fail "in-sync branch" "expected success once main is an ancestor of develop"
    fi
  )
  rm -rf "$repo" /tmp/leak-out
  pass_count=$((pass_count + 1))
}

assert_leaked_main_commits_detected
test_main
