#!/bin/sh
set -eu

run_audit_check() {
  base_ref="${1:-}"

  if ! command -v pnpm >/dev/null 2>&1; then
    if [ "${SECURITY_SUITE_REQUIRE_TOOLS:-false}" = "true" ]; then
      echo "security-suite: pnpm is required for this run" >&2
      return 127
    fi
    echo "security-suite: pnpm not installed; skipping audit" >&2
    return 0
  fi

  if [ -z "$base_ref" ]; then
    pnpm audit --prod --audit-level high
    return $?
  fi

  run_audit_check_against_base "$base_ref"
}

# Only fails on vulnerabilities introduced or worsened relative to base_ref —
# a pre-existing high-severity finding elsewhere in the tree that a PR doesn't
# touch can't be fixed by that PR, so it shouldn't block it. Falls back to the
# zero-tolerance check if base_ref's manifest/lockfile can't be read.
run_audit_check_against_base() {
  base_ref="$1"
  base_dir=$(mktemp -d "${TMPDIR:-/tmp}/substrate-audit-base.XXXXXX")
  head_json=$(mktemp "${TMPDIR:-/tmp}/substrate-audit-head.XXXXXX")
  base_json=$(mktemp "${TMPDIR:-/tmp}/substrate-audit-basejson.XXXXXX")

  if ! git show "${base_ref}:package.json" > "$base_dir/package.json" 2>/dev/null \
     || ! git show "${base_ref}:pnpm-lock.yaml" > "$base_dir/pnpm-lock.yaml" 2>/dev/null; then
    # A shallow checkout may not have base_ref locally yet — try a shallow
    # fetch of it before giving up (covers CI jobs that only check out HEAD).
    case "$base_ref" in
      origin/*) git fetch --depth=1 origin "${base_ref#origin/}" >/dev/null 2>&1 || true ;;
    esac

    if ! git show "${base_ref}:package.json" > "$base_dir/package.json" 2>/dev/null \
       || ! git show "${base_ref}:pnpm-lock.yaml" > "$base_dir/pnpm-lock.yaml" 2>/dev/null; then
      rm -rf "$base_dir"
      rm -f "$head_json" "$base_json"
      echo "security-suite: could not read package.json/pnpm-lock.yaml at '$base_ref'; falling back to a zero-tolerance audit" >&2
      pnpm audit --prod --audit-level high
      return $?
    fi
  fi

  pnpm audit --prod --audit-level high --json > "$head_json" 2>/dev/null || true
  (cd "$base_dir" && pnpm audit --prod --audit-level high --json > "$base_json" 2>/dev/null) || true

  status=0
  AUDIT_HEAD_JSON="$head_json" AUDIT_BASE_JSON="$base_json" AUDIT_BASE_REF="$base_ref" node -e '
    const fs = require("fs");

    const parseAuditReport = (path) => {
      let report;
      try {
        report = JSON.parse(fs.readFileSync(path, "utf8"));
      } catch (error) {
        return null;
      }
      // A well-formed `pnpm audit --json` report always carries a `metadata`
      // object, even when it finds nothing — its absence means the audit
      // itself did not run (e.g. a registry error), not "zero vulnerabilities".
      return report && typeof report === "object" && report.metadata ? report : null;
    };

    const head = parseAuditReport(process.env.AUDIT_HEAD_JSON);
    const base = parseAuditReport(process.env.AUDIT_BASE_JSON);

    if (!head || !base) {
      console.error("security-suite: pnpm audit did not produce a usable report for " + (!head ? "HEAD" : process.env.AUDIT_BASE_REF) + " — treating as a failure rather than silently passing");
      process.exit(1);
    }

    const key = (advisory) => advisory.github_advisory_id || String(advisory.id);
    const baseIds = new Set(Object.values(base.advisories || {}).map(key));
    const headAdvisories = Object.values(head.advisories || {});
    const introduced = headAdvisories.filter((advisory) => !baseIds.has(key(advisory)));
    const preexisting = headAdvisories.filter((advisory) => baseIds.has(key(advisory)));

    if (introduced.length > 0) {
      const plural = introduced.length === 1 ? "y" : "ies";
      console.error(`security-suite: ${introduced.length} new or worsened vulnerabilit${plural} introduced relative to ${process.env.AUDIT_BASE_REF}:`);
      for (const advisory of introduced) {
        console.error(`  - [${advisory.severity}] ${advisory.title} (${key(advisory)}) in ${advisory.module_name}`);
      }
      process.exit(1);
    }

    if (preexisting.length > 0) {
      const plural = preexisting.length === 1 ? "y" : "ies";
      console.error(`security-suite: ${preexisting.length} pre-existing vulnerabilit${plural} unaffected by this change (already present on ${process.env.AUDIT_BASE_REF}); not blocking`);
    }
    process.exit(0);
  ' || status=$?

  rm -rf "$base_dir"
  rm -f "$head_json" "$base_json"
  return $status
}

run_gitleaks_check() {
  mode="$1"
  target="${2:-}"

  if ! command -v gitleaks >/dev/null 2>&1; then
    if [ "${SECURITY_SUITE_REQUIRE_TOOLS:-false}" = "true" ]; then
      echo "security-suite: gitleaks is required for this run" >&2
      return 127
    fi
    echo "security-suite: gitleaks not installed; skipping ${mode}" >&2
    return 0
  fi

  case "$mode" in
    staged) gitleaks protect --staged --redact --no-banner ;;
    range) gitleaks detect --no-banner --redact --source . --log-opts="$target" ;;
    *)
      echo "security-suite: unknown gitleaks mode '$mode'" >&2
      return 1
      ;;
  esac
}

prepare_semgrep_environment() {
  semgrep_state_dir="${SEMGREP_STATE_DIR:-${TMPDIR:-/tmp}/substrate-semgrep}"
  mkdir -p "$semgrep_state_dir/config" "$semgrep_state_dir/cache"
  export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$semgrep_state_dir/config}"
  export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$semgrep_state_dir/cache}"
  export SEMGREP_LOG_FILE="${SEMGREP_LOG_FILE:-$semgrep_state_dir/semgrep.log}"
  export SEMGREP_SETTINGS_FILE="${SEMGREP_SETTINGS_FILE:-$semgrep_state_dir/settings.yml}"
  if [ -z "${SSL_CERT_FILE:-}" ] && [ -f /opt/homebrew/etc/ca-certificates/cert.pem ]; then
    export SSL_CERT_FILE=/opt/homebrew/etc/ca-certificates/cert.pem
  fi
}

prepare_semgrep_git_environment() {
  git config --global --add safe.directory "$(pwd)" >/dev/null 2>&1 || true
}

semgrep_targets_for_range() {
  range="$1"
  target_file="$2"
  prepare_semgrep_git_environment
  git diff --name-only -z --diff-filter=ACMR "$range" > "$target_file"
}

run_semgrep_check() {
  range="$1"
  targets_file=$(mktemp "${TMPDIR:-/tmp}/substrate-semgrep-targets.XXXXXX")

  if ! command -v semgrep >/dev/null 2>&1; then
    if [ "${SECURITY_SUITE_REQUIRE_TOOLS:-false}" = "true" ]; then
      echo "security-suite: semgrep is required for this run" >&2
      return 127
    fi
    echo "security-suite: semgrep not installed; skipping scan" >&2
    return 0
  fi

  prepare_semgrep_environment
  semgrep_targets_for_range "$range" "$targets_file"
  if [ ! -s "$targets_file" ]; then
    rm -f "$targets_file"
    echo "security-suite: no changed files for semgrep in $range"
    return 0
  fi

  if xargs -0 semgrep scan --quiet --config=auto --error --disable-version-check < "$targets_file"; then
    rm -f "$targets_file"
    return 0
  fi

  rm -f "$targets_file"
  echo "security-suite: findings detected in $range" >&2
  return 1
}

run_semgrep_sarif_check() {
  range="$1"
  output="${2:-semgrep.sarif}"
  targets_file=$(mktemp "${TMPDIR:-/tmp}/substrate-semgrep-targets.XXXXXX")

  if ! command -v semgrep >/dev/null 2>&1; then
    if [ "${SECURITY_SUITE_REQUIRE_TOOLS:-false}" = "true" ]; then
      echo "security-suite: semgrep is required for this run" >&2
      return 127
    fi
    echo "security-suite: semgrep not installed; skipping sarif scan" >&2
    return 0
  fi

  prepare_semgrep_environment
  semgrep_targets_for_range "$range" "$targets_file"
  if [ ! -s "$targets_file" ]; then
    printf '{"version":"2.1.0","runs":[]}\n' > "$output"
    rm -f "$targets_file"
    echo "security-suite: no changed files for semgrep in $range"
    return 0
  fi

  if xargs -0 semgrep scan --quiet --config=auto --error --disable-version-check --sarif --output="$output" < "$targets_file"; then
    rm -f "$targets_file"
    return 0
  fi

  rm -f "$targets_file"
  echo "security-suite: findings detected in $range" >&2
  return 1
}
