#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'FAIL: %s\n  %s\n' "$1" "$2" >&2
  exit 1
}

assert_eq() {
  [ "$2" = "$3" ] || fail "$1" "expected '$2' got '$3'"
}

assert_contains() {
  printf '%s' "$3" | grep -F -- "$2" >/dev/null 2>&1 || fail "$1" "missing '$2'"
}

assert_not_contains() {
  if printf '%s' "$3" | grep -F -- "$2" >/dev/null 2>&1; then
    fail "$1" "unexpected '$2'"
  fi
}

assert_before() {
  local label="$1" first="$2" second="$3" value="$4" first_line second_line

  first_line=$(printf '%s\n' "$value" | grep -n -F -- "$first" | head -n 1 | cut -d: -f1)
  second_line=$(printf '%s\n' "$value" | grep -n -F -- "$second" | head -n 1 | cut -d: -f1)
  [ -n "$first_line" ] && [ -n "$second_line" ] && [ "$first_line" -lt "$second_line" ] || fail "$label" "expected '$first' before '$second'"
}

assert_resolve_pull_request_head_action() {
  local label="$1" workflow="$2"

  assert_contains "$label uses the trusted submitted-head action" "uses: ./.github/actions/resolve-pull-request-head" "$workflow"
  assert_contains "$label passes the target branch to the submitted-head action" "base-ref: \${{ github.base_ref }}" "$workflow"
  assert_contains "$label passes the pull request number to the submitted-head action" "pull-request-number: \${{ github.event.pull_request.number }}" "$workflow"
  assert_contains "$label passes the immutable commit to the submitted-head action" "expected-head-sha: \${{ github.event.pull_request.head.sha }}" "$workflow"
  assert_not_contains "$label does not fetch submitted code by raw SHA" 'git fetch --no-tags origin "$HEAD_SHA"' "$workflow"
  assert_not_contains "$label does not fetch the pull request head directly" 'git fetch --no-tags origin "pull/$PR_NUMBER/head' "$workflow"
  assert_not_contains "$label does not check out submitted workflow code" "ref: \${{ github.event.pull_request.head.sha }}" "$workflow"
}

make_repo() {
  local tmp branch
  branch="${1:-develop}"
  tmp=$(mktemp -d)
  (
    cd "$tmp" || exit 1
    git init -q -b "$branch"
    git config user.email test@example.com
    git config user.name Test
    echo base > README.md
    git add README.md
    git commit -q -m "base"
  )
  printf '%s\n' "$tmp"
}

stub_cmd() {
  local repo="$1" cmd="$2" body="$3"
  mkdir -p "$repo/bin"
  cat > "$repo/bin/$cmd" <<EOF
#!/bin/sh
$body
EOF
  chmod +x "$repo/bin/$cmd"
}

setup_pre_push_fixture() {
  local repo="$1" repo_root="$2"
  mkdir -p "$repo/.githooks" "$repo/scripts" "$repo/packages/example"
  cp -R "$repo_root/.githooks/lib" "$repo/.githooks/lib"
  cp "$repo_root/.githooks/pre-push" "$repo/.githooks/pre-push"
  chmod +x "$repo/.githooks/pre-push"
}

stub_pre_push_hook_suite() {
  local repo="$1" failure_mode="${2:-none}"
  cat > "$repo/scripts/hook-suite.sh" <<'HOOK'
#!/bin/sh
printf '%s\n' "$*" >> hook-suite.calls
if [ -f .hook-suite-fail-generated-artifacts ] && [ "$1" = generated-artifacts ]; then
  exit 1
fi
exit 0
HOOK
  chmod +x "$repo/scripts/hook-suite.sh"

  if [ "$failure_mode" = "generated-artifacts" ]; then
    : > "$repo/.hook-suite-fail-generated-artifacts"
  fi
}
