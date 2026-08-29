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

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p packages/a
  printf '%s\n' '{"name":"a","version":"1.0.0"}' > packages/a/package.json
  git add -A
  git commit -q -m "chore: base release state"
  git update-ref refs/remotes/origin/main HEAD
  if assert_pending_changesets_are_valid origin/main refs/heads/missing >missing-ref.out 2>&1; then
    fail "release gates" "expected missing changeset validation ref to fail"
  fi
  assert_eq "missing changeset validation ref diagnostic" "ERROR: Cannot resolve Changeset validation head ref refs/heads/missing." "$(cat missing-ref.out)"
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
  git rm -q .changeset/empty.md
  git commit -q -m "chore: remove empty changeset"
  mkdir -p .changeset
  printf '%s\n' '---' '"a": patch' '---' '' 'Releases package a.' > .changeset/a.md
  git add .changeset/a.md
  git commit -q -m "chore: add changeset"
  assert_changeset_required origin/main
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

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p .changeset packages/example
  marker="$repo/candidate-code-executed"
  printf '%s\n' '{"name":"fixture","version":"1.0.0"}' > package.json
  printf '%s\n' 'packages:' '  - "packages/*"' > pnpm-workspace.yaml
  printf '%s\n' '{"name":"@fixture/example","version":"1.0.0"}' > packages/example/package.json
  git add -A
  git commit -q -m "chore: base changeset fixture"
  git update-ref refs/remotes/origin/develop HEAD

  git switch -q -c feature/valid-changeset
  mkdir -p packages/introduced
  printf '{"name":"fixture","version":"1.0.0","scripts":{"changeset":"touch %s"}}\n' "$marker" > package.json
  printf '%s\n' '{"changelog":"./malicious-changelog.cjs"}' > .changeset/config.json
  printf 'require("node:fs").writeFileSync("%s", "executed");\n' "$marker" > malicious-changelog.cjs
  printf '%s\n' '{"name":"@fixture/introduced","version":"1.0.0"}' > packages/introduced/package.json
  printf '%s\n' '---' '"@fixture/introduced": patch' '---' '' 'Releases the introduced package.' > .changeset/introduced.md
  git add -A
  git commit -q -m "chore: add valid introduced changeset"
  valid_ref=$(git rev-parse HEAD)

  git switch -q develop
  assert_changeset_required origin/develop "$valid_ref"
  [ ! -e "$marker" ] || fail "release gates data-only validation" "candidate package metadata executed"

  git switch -q -c feature/invalid-changeset
  mkdir -p .changeset
  printf '%s\n' '---' '"@fixture/missing": patch' '---' '' 'References a package that does not exist.' > .changeset/invalid.md
  git add .changeset/invalid.md
  git commit -q -m "chore: add invalid changeset"
  invalid_ref=$(git rev-parse HEAD)

  git switch -q develop
  if assert_changeset_required origin/develop "$invalid_ref" >changeset-validation.out 2>&1; then
    fail "release gates validate supplied ref" "expected semantic validation of the non-checked-out ref to fail"
  fi

  assert_contains "release gates validate supplied ref" "ERROR: .changeset/invalid.md references workspace package @fixture/missing" "$(cat changeset-validation.out)"
  [ ! -e "$marker" ] || fail "release gates data-only validation" "candidate package metadata executed"
)
rm -rf "$repo"

test_main
