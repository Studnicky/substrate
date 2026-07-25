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

dist_ready() {
  for pkgjson in packages/*/package.json; do
    dir=$(dirname "$pkgjson")
    if [ ! -f "$dir/dist/index.js" ]; then return 1; fi
  done
}

prepare_dist() {
  if dist_ready; then return 0; fi
  pnpm run build
}

for check in "$@"; do
  case "$check" in
    config-schema-check) pnpm run config-schema:check ;;
    stamp-version-check) pnpm run stamp-version:check ;;
    typecheck) pnpm run typecheck ;;
    lint) prepare_dist && pnpm run lint ;;
    test) prepare_dist && pnpm run test:unit ;;
    test-unit) prepare_dist && pnpm run test:unit ;;
    test-integration) prepare_dist && pnpm run test:integration ;;
    test-smoke) prepare_dist && pnpm run test:smoke ;;
    test-all) prepare_dist && pnpm run test:all ;;
    build) pnpm run build && verify_dist ;;
    docs-build) prepare_dist && pnpm run docs:build ;;
    docs-includes) pnpm run lint:docs ;;
    generated-artifacts) prepare_dist && pnpm run config-schema:check && pnpm run stamp-version:check && pnpm run diagram:deps:check ;;
    predocs-build) pnpm run predocs:build ;;
    audit) run_audit_check ;;
    verify-dist) prepare_dist && verify_dist ;;
    diagram-check) prepare_dist && pnpm run diagram:deps:check ;;
    diagram-blast-radius) prepare_dist && pnpm run diagram:deps:blast-radius -- --base "${CI_SUITE_BASE_REF:-origin/develop}" ;;
    *)
      echo "ci-suite: unknown check '$check'" >&2
      exit 1
      ;;
  esac
done
