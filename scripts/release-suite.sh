#!/usr/bin/env bash
set -euo pipefail

. "$(dirname "$0")/../.githooks/lib/release-gates.sh"

release_suite_changeset_status() {
  default_ref="${1:-origin/develop}"
  if [ -d .changeset ]; then
    env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_PREFIX pnpm changeset status --since="$default_ref"
  fi
}

release_suite_verify_lockstep() {
  local expected_version="$1" head_ref="${2:-}"
  assert_workspace_lockstep_version "$expected_version" "$head_ref"
}

release_suite_verify_backmerge() {
  local expected_version="$1" main_ref="$2" base_ref="$3" head_ref="$4"

  assert_workspace_lockstep_version "$expected_version" "$head_ref"
  if ! git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
    echo "::error::The canonical main-to-develop backmerge requires ${base_ref}." >&2
    return 1
  fi
  release_suite_verify_backmerge_result "$main_ref" "$head_ref"
}

release_suite_verify_backmerge_result() {
  local main_ref="$1" merged_develop_ref="$2"

  if ! git rev-parse --verify "$main_ref" >/dev/null 2>&1; then
    echo "::error::The canonical main-to-develop backmerge requires ${main_ref}." >&2
    return 1
  fi
  if ! git rev-parse --verify "$merged_develop_ref" >/dev/null 2>&1; then
    echo "::error::The canonical main-to-develop backmerge requires ${merged_develop_ref}." >&2
    return 1
  fi
  if ! git merge-base --is-ancestor "$main_ref" "$merged_develop_ref"; then
    echo "::error::The canonical main-to-develop backmerge result must retain ${main_ref} as an ancestor of ${merged_develop_ref}." >&2
    return 1
  fi
}

release_suite_publish_gates() {
  local expected_version="$1" head_ref="${2:-}" root_version
  root_version=$(release_root_version "$head_ref")
  if [ "$expected_version" != "$root_version" ]; then
    echo "::error::Tag version (${expected_version}) does not match root package.json version (${root_version})" >&2
    return 1
  fi
  release_suite_verify_lockstep "$expected_version" "$head_ref"
  assert_no_pending_changesets "$head_ref"
}

release_suite_branch_name() {
  local ref="$1"
  ref="${ref#refs/heads/}"
  ref="${ref#refs/remotes/origin/}"
  ref="${ref#origin/}"
  printf '%s\n' "$ref"
}

release_suite_verify_flow() {
  local base_ref="$1" head_ref="$2" source_branch="$3" base_branch head_branch version
  base_branch=$(release_suite_branch_name "$base_ref")
  head_branch=$(release_suite_branch_name "$source_branch")
  version=$(release_root_version "$head_ref")

  case "$base_branch:$head_branch" in
    develop:main)
      release_suite_verify_backmerge "$version" origin/main "$base_ref" "$head_ref"
      ;;
    develop:release/*|develop:hotfix/*)
      echo "::error::${head_branch} must target main, not develop." >&2
      return 1
      ;;
    develop:*)
      assert_changeset_required "$base_ref" "$head_ref"
      ;;
    main:release/*|main:hotfix/*)
      release_suite_publish_gates "$version" "$head_ref"
      ;;
    main:*)
      echo "::error::${head_branch} cannot target main; only release/* and hotfix/* branches may do so." >&2
      return 1
      ;;
    *)
      echo "::error::Unsupported Git flow pair: ${head_branch} -> ${base_branch}." >&2
      return 1
      ;;
  esac
}

case "${1:-}" in
  changeset-status)
    release_suite_changeset_status "${2:-origin/develop}"
    ;;
  verify-lockstep)
    release_suite_verify_lockstep "${2:?missing version}" "${3:-}"
    ;;
  verify-backmerge)
    release_suite_verify_backmerge "${2:?missing version}" origin/main "${3:?missing base ref}" "${4:?missing head ref}"
    ;;
  verify-backmerge-result)
    release_suite_verify_backmerge_result "${2:?missing main ref}" "${3:?missing merged develop ref}"
    ;;
  publish-gates)
    release_suite_publish_gates "${2:?missing version}" "${3:-}"
    ;;
  verify-flow)
    release_suite_verify_flow "${2:?missing base ref}" "${3:?missing stored head ref}" "${4:?missing source branch}"
    ;;
  *)
    echo "release-suite: unknown suite '${1:-}'" >&2
    exit 1
    ;;
esac
