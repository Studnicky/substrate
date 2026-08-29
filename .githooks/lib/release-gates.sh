#!/usr/bin/env bash
set -euo pipefail

release_root_version() {
  node -p "require('./package.json').version"
}

pending_changeset_count() {
  if [ ! -d .changeset ]; then
    echo 0
    return
  fi

  find .changeset -maxdepth 1 -type f -name '*.md' ! -name 'README.md' -size +0c | wc -l | tr -d ' '
}

assert_pending_changesets_are_valid() {
  local base_ref="$1"
  env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_PREFIX pnpm changeset status --since="$base_ref"
}

assert_workspace_lockstep_version() {
  local expected_version="$1" mismatch pkg_json pkg_name pkg_ver
  mismatch=0

  for pkg_json in packages/*/package.json; do
    pkg_name=$(node -p "require('./${pkg_json}').name")
    pkg_ver=$(node -p "require('./${pkg_json}').version")
    if [ "$pkg_ver" != "$expected_version" ]; then
      echo "::error::${pkg_name}@${pkg_ver} is not at version ${expected_version}" >&2
      mismatch=1
    fi
  done

  return "$mismatch"
}

assert_no_pending_changesets() {
  local pending
  pending=$(pending_changeset_count)
  if [ "$pending" -ne 0 ]; then
    echo "::error::${pending} unconsumed changeset(s) remain in .changeset/ — run 'pnpm changeset:version' and commit the result before tagging." >&2
    return 1
  fi
}

assert_changeset_required() {
  local base_ref="$1" changeset_path has_added_changeset
  has_added_changeset=false

  while IFS= read -r -d '' changeset_path; do
    case "$changeset_path" in
      .changeset/README.md) ;;
      .changeset/*.md)
        if [ -s "$changeset_path" ]; then
          has_added_changeset=true
          break
        fi
        ;;
    esac
  done < <(git diff --name-only -z --diff-filter=A "$base_ref"...HEAD -- .changeset)

  if [ "$has_added_changeset" = "false" ]; then
    echo "ERROR: This PR must add a non-empty changeset." >&2
    echo "Run 'pnpm changeset' and commit the generated .changeset/*.md file before merging to main." >&2
    return 1
  fi

  if ! assert_pending_changesets_are_valid "$base_ref"; then
    echo "ERROR: Pending changeset input is invalid." >&2
    return 1
  fi
}
