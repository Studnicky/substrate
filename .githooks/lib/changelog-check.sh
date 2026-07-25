#!/bin/sh
set -eu

_resolve_range() {
  local sha="$1"
  local default_branch="${2:-}"

  if [ -z "$default_branch" ]; then
    default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
    default_branch="${default_branch:-develop}"
  fi

  local fork_point
  fork_point=$(git merge-base "origin/${default_branch}" "$sha" 2>/dev/null)
  if [ -n "$fork_point" ]; then
    echo "${fork_point}..${sha}"
  else
    echo "origin/${default_branch}..${sha}"
  fi
}

check_changelog_updated() {
  local sha="$1"
  local default_branch="${2:-}"
  local range
  range=$(_resolve_range "$sha" "$default_branch")
  git diff --name-only "$range" 2>/dev/null | grep -Fx "CHANGELOG.md" >/dev/null
}

check_changelog_format() {
  [ -f CHANGELOG.md ] || return 0
  grep -q "^## \[Unreleased\]" CHANGELOG.md
}

is_non_shipping_only() {
  local sha="$1"
  local default_branch="${2:-}"
  local range
  range=$(_resolve_range "$sha" "$default_branch")

  while IFS= read -r file; do
    [ -z "$file" ] && continue
    case "$file" in
      CHANGELOG.md) return 1 ;;
      .github/*|scripts/*|docs/*|README.md|CONTRIBUTING.md|LICENSE*) ;;
      *) return 1 ;;
    esac
  done <<EOF
$(git diff --name-only "$range" 2>/dev/null)
EOF
  return 0
}
