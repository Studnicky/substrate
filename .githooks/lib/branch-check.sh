#!/usr/bin/env bash
set -euo pipefail

check_branch_name() {
  local branch="$1"
  local semver='(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?'
  local slug='([A-Z]{2,10}-[0-9]+-)?[A-Za-z0-9]+(-[A-Za-z0-9]+)*'

  if [[ "$branch" == "main" || "$branch" == "develop" ]]; then
    return 0
  fi

  if [[ "$branch" =~ ^release/v${semver}$ ]]; then
    return 0
  fi

  if [[ "$branch" =~ ^hotfix/(v?${semver}|${slug})$ ]]; then
    return 0
  fi

  if [[ "$branch" =~ ^(feature|fix|bugfix|chore|docs|test|refactor|perf|ci|build)/${slug}$ ]]; then
    return 0
  fi

  if [[ "$branch" =~ ^dependabot/[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$ ]]; then
    return 0
  fi

  echo "branch-check: invalid branch name '$branch'" >&2
  return 1
}
