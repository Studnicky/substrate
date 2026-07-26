#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

REPO_ROOT="$(cd "$PWD/../.." && pwd)"

# A back-merge that lands as a merge commit keeps main reachable from develop.
repo=$(make_repo main)
(
  cd "$repo" || exit 1
  mkdir -p .githooks/lib
  cp "$REPO_ROOT/.githooks/lib/sync-check.sh" .githooks/lib/sync-check.sh

  git switch -q -c develop
  echo feature > feature.txt
  git add feature.txt
  git commit -q -m "feat: add feature"

  git switch -q main
  echo release > release.txt
  git add release.txt
  git commit -q -m "chore(release): prepare v1.0.0"

  git switch -q develop
  git merge -q --no-ff main -m "chore: back-merge v1.0.0 into develop"

  # shellcheck source=/dev/null
  . .githooks/lib/sync-check.sh
  if ! assert_sync_ancestry main develop 2>/dev/null; then
    fail "merge-commit back-merge keeps ancestry" "reported diverged after a merge commit"
  fi

  assert_eq "nothing unreachable after a merge back-merge" "0" "$(sync_unreachable_count main develop)"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

# A squashed back-merge copies the content but not the commits, so main stops
# being an ancestor. This is the failure that reached a release branch.
repo=$(make_repo main)
(
  cd "$repo" || exit 1
  mkdir -p .githooks/lib
  cp "$REPO_ROOT/.githooks/lib/sync-check.sh" .githooks/lib/sync-check.sh

  git switch -q -c develop
  echo feature > feature.txt
  git add feature.txt
  git commit -q -m "feat: add feature"

  git switch -q main
  echo release > release.txt
  git add release.txt
  git commit -q -m "chore(release): prepare v1.0.0"

  git switch -q develop
  git merge -q --squash main
  git commit -q -m "chore: back-merge v1.0.0 into develop"

  # shellcheck source=/dev/null
  . .githooks/lib/sync-check.sh

  # Main's content arrived — which is why a content comparison misses this.
  assert_eq "squashed back-merge copies main's content" "release" "$(git show develop:release.txt)"
  assert_eq "and develop keeps its own work" "feature" "$(git show develop:feature.txt)"

  if assert_sync_ancestry main develop 2>/dev/null; then
    fail "squashed back-merge is caught" "reported in sync despite broken ancestry"
  fi

  assert_eq "the release commit is unreachable" "1" "$(sync_unreachable_count main develop)"

  message=$(assert_sync_ancestry main develop 2>&1 || true)
  assert_contains "diagnosis names the remedy" "merge commit" "$message"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

# The policy-suite entry point exposes the same verdict.
repo=$(make_repo main)
(
  cd "$repo" || exit 1
  mkdir -p .githooks/lib scripts
  cp "$REPO_ROOT/.githooks/lib/sync-check.sh" .githooks/lib/sync-check.sh
  cp "$REPO_ROOT/scripts/policy-suite.sh" scripts/policy-suite.sh

  git switch -q -c develop
  git switch -q main
  echo release > release.txt
  git add release.txt
  git commit -q -m "chore(release): prepare v1.0.0"
  git switch -q develop
  git merge -q --squash main
  git commit -q -m "chore: back-merge into develop"

  if bash scripts/policy-suite.sh sync-ancestry main develop >/dev/null 2>&1; then
    fail "policy-suite reports divergence" "sync-ancestry passed on a squashed back-merge"
  fi

  git merge -q --no-ff main -m "chore: back-merge with a merge commit"
  if ! bash scripts/policy-suite.sh sync-ancestry main develop >/dev/null 2>&1; then
    fail "policy-suite clears a repaired branch" "sync-ancestry failed after a merge commit"
  fi
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

test_main
