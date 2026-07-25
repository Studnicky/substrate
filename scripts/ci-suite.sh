#!/bin/sh
set -eu

. "$(dirname "$0")/../.githooks/lib/security-suite.sh"

verify_dist() {
  missing=0
  for pkgjson in packages/*/package.json; do
    dir=$(dirname "$pkgjson")
    if [ -f "$dir/dist/index.js" ]; then continue; fi
    echo "::error::missing dist/index.js for $dir"; missing=1
  done
  test "$missing" -eq 0
}

for check in "$@"; do
  case "$check" in
    config-schema-check) pnpm run config-schema:check ;;
    stamp-version-check) pnpm run stamp-version:check ;;
    typecheck) pnpm run typecheck ;;
    lint) pnpm run lint ;;
    test) pnpm run test:unit ;;
    test-unit) pnpm run test:unit ;;
    test-integration) pnpm run test:integration ;;
    test-smoke) pnpm run test:smoke ;;
    test-all) pnpm run test:all ;;
    build) pnpm run build && verify_dist ;;
    docs-build) pnpm run docs:build ;;
    docs-includes) pnpm run lint:docs ;;
    generated-artifacts) pnpm run config-schema:check && pnpm run stamp-version:check && pnpm run diagram:deps:check ;;
    predocs-build) pnpm run predocs:build ;;
    audit) run_audit_check ;;
    verify-dist) verify_dist ;;
    diagram-check) pnpm run diagram:deps:check ;;
    diagram-blast-radius) pnpm run diagram:deps:blast-radius -- --base "${CI_SUITE_BASE_REF:-origin/develop}" ;;
    *)
      echo "ci-suite: unknown check '$check'" >&2
      exit 1
      ;;
  esac
done
