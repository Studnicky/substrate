#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/release-gates.sh
source "../lib/release-gates.sh"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p packages/a packages/b .changeset
  printf '%s\n' '{"name":"a","version":"1.0.0"}' > packages/a/package.json
  printf '%s\n' '{"name":"b","version":"1.0.0"}' > packages/b/package.json
  git add -A
  git commit -q -m "chore: committed release state"
  release_ref=$(git rev-parse HEAD)

  assert_workspace_lockstep_version "1.0.0"
  assert_workspace_lockstep_version "1.0.0" "$release_ref"
  assert_no_pending_changesets

  printf '%s\n' '{"name":"a","version":"2.0.0"}' > packages/a/package.json
  if assert_workspace_lockstep_version "1.0.0" 2>/dev/null; then
    fail "release gates" "expected worktree version drift to fail"
  fi
  assert_workspace_lockstep_version "1.0.0" "$release_ref"

  printf '%s\n' '---' '"a": patch' '---' '' 'Releases package a.' > .changeset/a.md
  if assert_no_pending_changesets 2>/dev/null; then
    fail "release gates" "expected worktree changeset to fail"
  fi
  assert_no_pending_changesets "$release_ref"
)
rm -rf "$repo"
pass_count=$((pass_count + 6))

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p packages/a packages/b
  printf '%s\n' '{invalid json' > packages/a/package.json
  printf '%s\n' '{"name":"b","version":"1.0.0"}' > packages/b/package.json
  if manifest_error=$(assert_workspace_lockstep_version "1.0.0" 2>&1); then
    fail "release gates" "expected malformed workspace manifest to fail"
  fi
  assert_contains "invalid workspace manifest diagnostic" "::error::packages/a/package.json contains invalid JSON:" "$manifest_error"

  printf '%s\n' '{"name":"a","version":1}' > packages/a/package.json
  if property_error=$(assert_workspace_lockstep_version "1.0.0" 2>&1); then
    fail "release gates" "expected invalid workspace manifest property to fail"
  fi
  assert_contains "invalid workspace manifest property diagnostic" "::error::packages/a/package.json property \"version\" must be a non-empty string." "$property_error"
)
rm -rf "$repo"
pass_count=$((pass_count + 2))

repo=$(make_repo)
(
  cd "$repo" || exit 1
  stub_cmd "$repo" pnpm '
printf "%s\\n" "$*" > .pnpm-command
if [ -f .changeset/invalid.md ]; then
  exit 1
fi
'
  PATH="$repo/bin:$PATH"
  git add -A
  git commit -q -m "chore: base release state"
  git update-ref refs/remotes/origin/main HEAD
  if assert_changeset_required origin/main 2>/dev/null; then
    fail "release gates" "expected missing changeset to fail"
  fi
  mkdir -p .changeset
  : > .changeset/empty.md
  git add .changeset/empty.md
  git commit -q -m "chore: empty changeset"
  if assert_changeset_required origin/main 2>/dev/null; then
    fail "release gates" "expected empty changeset to fail"
  fi
  printf '%s\n' '---' '"a": patch' '---' '' 'Releases package a.' > .changeset/a.md
  git add .changeset/a.md
  git commit -q -m "chore: add changeset"
  assert_changeset_required origin/main
  assert_eq "changeset status base" "changeset status --since=origin/main" "$(cat .pnpm-command)"
  printf '%s\n' 'invalid' > .changeset/invalid.md
  git add .changeset/invalid.md
  git commit -q -m "chore: invalid changeset"
  if assert_changeset_required origin/main 2>/dev/null; then
    fail "release gates" "expected invalid changeset to fail"
  fi
  rm .changeset/invalid.md
  if assert_no_pending_changesets 2>/dev/null; then
    fail "release gates" "expected pending changesets to fail"
  fi
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

test_main
