#!/bin/sh
set -eu

. "$(dirname "$0")/../.githooks/lib/security-suite.sh"

package_dist_ready() {
  node -e '
    const filesystem = require("node:fs");
    const paths = require("node:path");
    const manifestPath = process.argv[1];
    const manifest = JSON.parse(filesystem.readFileSync(manifestPath, "utf8"));
    const targets = new Set();
    const collectTargets = (entry) => {
      if (typeof entry === "string") {
        if (entry.startsWith("./dist/") && (entry.endsWith(".js") || entry.endsWith(".d.ts"))) {
          targets.add(entry);
        }
        return;
      }
      if (entry !== null && typeof entry === "object") {
        for (const value of Object.values(entry)) {
          collectTargets(value);
        }
      }
    };
    collectTargets(manifest.exports);
    const packageDirectory = paths.dirname(manifestPath);
    const missing = [...targets].filter((target) => !filesystem.existsSync(paths.resolve(packageDirectory, target)));
    for (const target of missing) {
      console.error("::error::missing " + target + " for " + packageDirectory);
    }
    process.exitCode = missing.length === 0 ? 0 : 1;
  ' "$1"
}

verify_dist() {
  missing=0
  for pkgjson in packages/*/package.json; do
    package_dist_ready "$pkgjson" || missing=1
  done
  test "$missing" -eq 0
}

dist_ready() {
  for pkgjson in packages/*/package.json; do
    package_dist_ready "$pkgjson" >/dev/null 2>&1 || return 1
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
    audit) run_audit_check "${CI_SUITE_BASE_REF:-}" ;;
    verify-dist) prepare_dist && verify_dist ;;
    diagram-check) prepare_dist && pnpm run diagram:deps:check ;;
    diagram-blast-radius) prepare_dist && pnpm run diagram:deps:blast-radius -- --base "${CI_SUITE_BASE_REF:-origin/develop}" ;;
    *)
      echo "ci-suite: unknown check '$check'" >&2
      exit 1
      ;;
  esac
done
