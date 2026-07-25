#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

REPO_ROOT="$(cd "$PWD/../.." && pwd)"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p .githooks scripts packages/example
  cp -R "$REPO_ROOT/.githooks/lib" .githooks/lib
  cp "$REPO_ROOT/.githooks/pre-push" .githooks/pre-push
  chmod +x .githooks/pre-push

  base_sha=$(git rev-parse HEAD)
  git update-ref refs/remotes/origin/develop "$base_sha"
  git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop
  git switch -q -c feature/staged-pre-push

  cat > scripts/hook-suite.sh <<'HOOK'
#!/bin/sh
printf '%s\n' "$1" >> hook-suite.calls
case "$1" in
  generated-artifacts) exit 1 ;;
  *) exit 0 ;;
esac
HOOK
  chmod +x scripts/hook-suite.sh

  printf '{"name":"@test/example"}\n' > packages/example/package.json
  git add -A
  git commit -q -m "feat: change package"
  local_sha=$(git rev-parse HEAD)

  if printf 'refs/heads/feature/staged-pre-push %s refs/heads/feature/staged-pre-push 0000000000000000000000000000000000000000\n' "$local_sha" | .githooks/pre-push >/tmp/pre-push-stage.out 2>&1; then
    fail "pre-push staged fail-fast" "pre-push succeeded despite generated-artifacts failure"
  fi

  assert_contains "pre-push policy ran" "generated-artifacts" "$(cat hook-suite.calls)"
  if grep -F -- "typecheck" hook-suite.calls >/dev/null 2>&1; then
    fail "pre-push validation skipped" "typecheck ran after policy stage failure"
  fi
  if grep -F -- "build" hook-suite.calls >/dev/null 2>&1; then
    fail "pre-push build skipped" "build ran after policy stage failure"
  fi
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

test_main
