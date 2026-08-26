#!/bin/sh
set -eu

rebase_base_for_branch() {
  case "$1" in
    hotfix/*|release/*) echo main ;;
    *) echo "$2" ;;
  esac
}

push_has_gatable_ref() {
  local default_branch="$1"
  local local_ref local_sha _remote_ref _remote_sha
  while read -r local_ref local_sha _remote_ref _remote_sha; do
    case "$local_ref" in
      refs/heads/*) ;;
      *) continue ;;
    esac
    [ "$local_sha" = "0000000000000000000000000000000000000000" ] && continue
    [ "${local_ref#refs/heads/}" = "$default_branch" ] && continue
    return 0
  done
  return 1
}

check_rebased_onto_base() {
  local base_branch="$1"
  local sha="${2:-HEAD}"
  local label="${3:-Branch}"

  if ! git show-ref --verify --quiet "refs/remotes/origin/${base_branch}"; then
    echo "  ⚠ origin/${base_branch} not available locally — skipping rebase check (CI will enforce it)"
    return 0
  fi

  if git merge-base --is-ancestor "origin/${base_branch}" "$sha"; then
    return 0
  fi

  echo "  ❌ ${label} is behind origin/${base_branch} — rebase before pushing:"
  echo "     git fetch origin ${base_branch} && git rebase origin/${base_branch}"
  return 1
}

# check_rebased_onto_base only proves a branch contains develop's commits, not
# that it avoids main's — a branch cut from main right after a release can
# satisfy that check (main was a superset of develop at that moment) while
# still carrying main-only content (a version bump, a stamped CHANGELOG) that
# develop hasn't absorbed yet. Landing that in develop corrupts the "main is
# an ancestor of develop" invariant sync-main-to-develop.yml depends on: the
# next real sync then has to 3-way-merge two independently-diverged copies of
# every release-owned file, which conflicts on principle, not by accident.
check_no_leaked_main_commits() {
  local sha="${1:-HEAD}"
  local label="${2:-Branch}"

  if ! git show-ref --verify --quiet refs/remotes/origin/main \
     || ! git show-ref --verify --quiet refs/remotes/origin/develop; then
    return 0
  fi

  # Nothing to leak once main and develop are back in sync.
  if git merge-base --is-ancestor origin/main origin/develop; then
    return 0
  fi

  if git rev-list "$sha" ^origin/develop | grep -qFf <(git rev-list origin/main ^origin/develop); then
    echo "  ❌ ${label} contains commit(s) from main that develop hasn't absorbed yet."
    echo "     main and develop are not currently in sync — branch from origin/develop instead of origin/main,"
    echo "     or wait for the pending main→develop sync to land before starting new work."
    return 1
  fi

  return 0
}
