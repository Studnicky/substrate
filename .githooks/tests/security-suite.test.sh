#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

HOOKS_DIR="$(cd "$PWD/.." && pwd)"
# shellcheck source=../lib/security-suite.sh
source "../lib/security-suite.sh"

assert_security_suite_calls_shared_commands() {
  local repo out

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    stub_cmd "$repo" pnpm 'printf "%s\n" "$*"'
    out=$(PATH="$repo/bin:$PATH" run_audit_check)
    assert_contains "security audit" "audit --prod --audit-level high" "$out"

    stub_cmd "$repo" gitleaks 'printf "%s\n" "$*"'
    out=$(PATH="$repo/bin:$PATH" run_gitleaks_check staged)
    assert_contains "gitleaks staged" "protect --staged --redact --no-banner" "$out"

    mkdir -p src
    echo "const x = 1" > src/file.ts
    git add src/file.ts
    git commit -q -m "add file"

    stub_cmd "$repo" semgrep 'printf "%s\n" "$*"'
    out=$(PATH="$repo/bin:$PATH" run_semgrep_check "HEAD~1..HEAD")
    assert_contains "semgrep scan" "scan --quiet --config=auto --error --disable-version-check src/file.ts" "$out"

    out=$(PATH="$repo/bin:$PATH" run_semgrep_sarif_check "HEAD~1..HEAD" semgrep.sarif)
    assert_contains "semgrep sarif" "scan --quiet --config=auto --error --disable-version-check --sarif --output=semgrep.sarif src/file.ts" "$out"

    if SECURITY_SUITE_REQUIRE_TOOLS=true PATH="$repo/empty-bin" run_gitleaks_check staged >/dev/null 2>&1; then
      fail "required gitleaks" "missing gitleaks should fail when tools are required"
    fi
  )
  rm -rf "$repo"
  pass_count=$((pass_count + 1))
}

assert_audit_check_baseline_diff() {
  local repo

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    echo '{}' > package.json
    echo 'lockfileVersion: 9.0' > pnpm-lock.yaml
    git add package.json pnpm-lock.yaml
    git commit -q -m "add manifest"

    cat > base-audit.json <<'JSON'
{"advisories":{"1001":{"id":1001,"github_advisory_id":"GHSA-aaaa-bbbb-cccc","severity":"high","title":"Pre-existing issue","module_name":"old-dep"}},"metadata":{"vulnerabilities":{"high":1}}}
JSON

    cat > head-audit-same.json <<'JSON'
{"advisories":{"1001":{"id":1001,"github_advisory_id":"GHSA-aaaa-bbbb-cccc","severity":"high","title":"Pre-existing issue","module_name":"old-dep"}},"metadata":{"vulnerabilities":{"high":1}}}
JSON

    cat > head-audit-new.json <<'JSON'
{"advisories":{"1001":{"id":1001,"github_advisory_id":"GHSA-aaaa-bbbb-cccc","severity":"high","title":"Pre-existing issue","module_name":"old-dep"},"2002":{"id":2002,"github_advisory_id":"GHSA-xxxx-yyyy-zzzz","severity":"high","title":"New issue","module_name":"new-dep"}},"metadata":{"vulnerabilities":{"high":2}}}
JSON

    stub_cmd "$repo" pnpm "
if [ -d .git ]; then
  cat '$repo/head-audit-same.json'
else
  cat '$repo/base-audit.json'
fi
"
    if ! PATH="$repo/bin:$PATH" run_audit_check HEAD >/dev/null 2>audit-out.log; then
      fail "audit baseline: no new vulnerabilities" "expected exit 0, got failure: $(cat audit-out.log)"
    fi
    assert_contains "audit baseline: pre-existing not blocking" "pre-existing vulnerability" "$(cat audit-out.log)"

    stub_cmd "$repo" pnpm "
if [ -d .git ]; then
  cat '$repo/head-audit-new.json'
else
  cat '$repo/base-audit.json'
fi
"
    if PATH="$repo/bin:$PATH" run_audit_check HEAD >/dev/null 2>audit-out.log; then
      fail "audit baseline: new vulnerability" "expected failure, got exit 0"
    fi
    assert_contains "audit baseline: reports new vulnerability" "GHSA-xxxx-yyyy-zzzz" "$(cat audit-out.log)"

    stub_cmd "$repo" pnpm 'echo "registry error" >&2; exit 1'
    if PATH="$repo/bin:$PATH" run_audit_check HEAD >/dev/null 2>audit-out.log; then
      fail "audit baseline: broken audit report" "a report with no metadata (audit itself failed) must not silently pass"
    fi
    assert_contains "audit baseline: broken report fails loud" "did not produce a usable report" "$(cat audit-out.log)"
  )
  rm -rf "$repo"
  pass_count=$((pass_count + 1))
}

assert_security_suite_calls_shared_commands
assert_audit_check_baseline_diff
test_main
