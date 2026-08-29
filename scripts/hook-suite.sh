#!/bin/sh
set -eu

run_hook_suite_full() {
  bash scripts/ci-suite.sh generated-artifacts typecheck lint test-all build
}

run_hook_suite_ci_check() {
  check="$1"
  bash scripts/ci-suite.sh "$check"
}

run_hook_suite_audit() {
  bash scripts/ci-suite.sh audit
}

run_hook_suite_diagram() {
  CI_SUITE_BASE_REF="${1:-origin/develop}" bash scripts/ci-suite.sh diagram-blast-radius
}

run_hook_suite_release_gates() {
  base_ref="$1"
  stored_head_ref="$2"
  source_branch="$3"
  bash scripts/release-suite.sh verify-flow "$base_ref" "$stored_head_ref" "$source_branch"
}

run_hook_suite_semgrep() {
  range="$1"
  bash scripts/security-suite.sh semgrep-range "$range"
}

case "${1:-}" in
  full)
    run_hook_suite_full
    ;;
  audit)
    run_hook_suite_audit
    ;;
  diagram)
    run_hook_suite_diagram "${2:-origin/develop}"
    ;;
  release-gates)
    run_hook_suite_release_gates "${2:?missing base ref}" "${3:?missing stored head ref}" "${4:?missing source branch}"
    ;;
  semgrep)
    run_hook_suite_semgrep "${2:?missing range}"
    ;;
  generated-artifacts|stamp-version-check|diagram-check|docs-includes|docs-build|typecheck|lint|test|test-unit|test-integration|test-smoke|test-all|build)
    run_hook_suite_ci_check "$1"
    ;;
  config-schema-check)
    run_hook_suite_ci_check "$1"
    ;;
  *)
    echo "hook-suite: unknown suite '${1:-}'" >&2
    exit 1
    ;;
esac
