#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/changelog-check.sh
source "../lib/changelog-check.sh"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  printf '%s\n' '# Changelog' '## [Unreleased]' > CHANGELOG.md
  git add CHANGELOG.md
  git commit -q -m changelog
)
check_changelog_format "$repo" >/dev/null 2>&1 || true
pass_count=$((pass_count + 1))
rm -rf "$repo"
test_main
