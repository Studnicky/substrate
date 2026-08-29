#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
# shellcheck source=../lib/changes.sh
source "../lib/changes.sh"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  classify_changes "HEAD~0..HEAD"
  assert_eq "docs" "false" "$CHANGED_DOCS"
  assert_eq "docs_assets" "false" "$CHANGED_DOCS_ASSETS"
  assert_eq "packages" "false" "$CHANGED_PACKAGES"
  assert_eq "scripts" "false" "$CHANGED_SCRIPTS"
  assert_eq "tests" "false" "$CHANGED_TESTS"
  assert_eq "source" "false" "$CHANGED_SOURCE"
  assert_eq "config" "false" "$CHANGED_CONFIG"
  assert_eq "workflows" "false" "$CHANGED_WORKFLOWS"
  assert_eq "hooks" "false" "$CHANGED_HOOKS"
  assert_eq "security_config" "false" "$CHANGED_SECURITY_CONFIG"
  assert_eq "generated_docs" "false" "$CHANGED_GENERATED_DOCS"
  assert_eq "lockfiles" "false" "$CHANGED_LOCKFILES"
  assert_eq "release" "false" "$CHANGED_RELEASE"
  assert_eq "ci" "false" "$CHANGED_CI"
  assert_eq "audit" "false" "$CHANGED_AUDIT"
  assert_eq "analysis" "false" "$CHANGED_ANALYSIS"
  assert_eq "docs workflow" "false" "$CHANGED_DOCS_WORKFLOW"
)
rm -rf "$repo"

_set_all_changed
assert_eq "all unit tests" "true" "$CHANGED_UNIT_TESTS"
assert_eq "all integration tests" "true" "$CHANGED_INTEGRATION_TESTS"
assert_eq "all smoke tests" "true" "$CHANGED_SMOKE_TESTS"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p docs/public
  echo "x" > docs/public/og-image.png
  git add -A
  git commit -q -m "docs assets"
  classify_changes "HEAD~1..HEAD"
  assert_eq "docs assets" "true" "$CHANGED_DOCS_ASSETS"
  assert_eq "generated docs" "true" "$CHANGED_GENERATED_DOCS"
  assert_eq "release asset" "true" "$CHANGED_RELEASE"
  assert_eq "docs workflow" "true" "$CHANGED_DOCS_WORKFLOW"
)
rm -rf "$repo"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p .github/workflows
  echo "name: semgrep" > .github/workflows/semgrep.yml
  git add -A
  git commit -q -m "security workflow"
  classify_changes "HEAD~1..HEAD"
  assert_eq "workflow" "true" "$CHANGED_WORKFLOWS"
  assert_eq "security config" "true" "$CHANGED_SECURITY_CONFIG"
  assert_eq "audit" "true" "$CHANGED_AUDIT"
)
rm -rf "$repo"
