#!/bin/sh
set -eu

run_branch_check() {
  local branch="$1"
  . .githooks/lib/branch-check.sh
  check_branch_name "$branch"
}

run_pr_title_check() {
  local base_ref="$1" head_ref="$2" title="$3"
  . .githooks/lib/runtime.sh
  hook_source_lib title-check.sh
  check_pr_title "$base_ref" "$head_ref" "$title"
}

run_changeset_required_check() {
  . .githooks/lib/release-gates.sh
  assert_changeset_required
}

run_ci_secrets_check() {
  node .github/scripts/check-ci-secrets.mjs
}

run_config_schema_check() {
  node scripts/config-schema.mjs --check
}

case "${1:-}" in
  branch)
    run_branch_check "${2:?missing branch}"
    ;;
  pr-title)
    run_pr_title_check "${2:?missing base ref}" "${3:?missing head ref}" "${4:?missing title}"
    ;;
  changeset-required)
    run_changeset_required_check
    ;;
  ci-secrets)
    run_ci_secrets_check
    ;;
  config-schema)
    run_config_schema_check
    ;;
  *)
    echo "policy-suite: unknown check '${1:-}'" >&2
    exit 1
    ;;
esac
