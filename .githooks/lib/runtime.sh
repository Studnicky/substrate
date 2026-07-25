#!/bin/sh

hook_skip_in_ci() {
  [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]
}

hook_repo_root() {
  git rev-parse --show-toplevel 2>/dev/null
}

hook_source_lib() {
  . "${HOOKS_DIR:-$(dirname "$0")}/lib/$1"
}
