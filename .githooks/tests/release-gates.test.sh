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

  assert_workspace_lockstep_version "1.0.0"
  assert_no_pending_changesets
)
rm -rf "$repo"
pass_count=$((pass_count + 2))

repo=$(make_repo)
(
  cd "$repo" || exit 1
  stub_cmd "$repo" pnpm '
if [ -f .changeset/invalid.md ]; then
  exit 1
fi
'
  PATH="$repo/bin:$PATH"
  if assert_changeset_required 2>/dev/null; then
    fail "release gates" "expected missing changeset to fail"
  fi
  mkdir -p .changeset
  : > .changeset/empty.md
  if assert_changeset_required 2>/dev/null; then
    fail "release gates" "expected empty changeset to fail"
  fi
  printf '%s\n' '---' '"a": patch' '---' '' 'Releases package a.' > .changeset/a.md
  assert_changeset_required
  printf '%s\n' 'invalid' > .changeset/invalid.md
  if assert_changeset_required 2>/dev/null; then
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
