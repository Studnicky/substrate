#!/bin/sh
set -eu

. "$(dirname "$0")/../.githooks/lib/release-gates.sh"

release_suite_changeset_status() {
  default_ref="${1:-origin/develop}"
  if [ -d .changeset ]; then
    env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_PREFIX pnpm changeset status --since="$default_ref"
  fi
}

release_suite_verify_lockstep() {
  expected_version="$1"
  assert_workspace_lockstep_version "$expected_version"
  assert_no_pending_changesets
}

release_suite_publish_gates() {
  expected_version="$1"
  root_version=$(release_root_version)
  if [ "$expected_version" != "$root_version" ]; then
    echo "::error::Tag version (${expected_version}) does not match root package.json version (${root_version})" >&2
    return 1
  fi
  release_suite_verify_lockstep "$expected_version"
}

case "${1:-}" in
  changeset-status)
    release_suite_changeset_status "${2:-origin/develop}"
    ;;
  verify-lockstep)
    release_suite_verify_lockstep "${2:?missing version}"
    ;;
  publish-gates)
    release_suite_publish_gates "${2:?missing version}"
    ;;
  *)
    echo "release-suite: unknown suite '${1:-}'" >&2
    exit 1
    ;;
esac
