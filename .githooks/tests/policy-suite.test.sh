#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

POLICY_RUNNER="$(cd "$PWD/../.." && pwd)/scripts/policy-suite.sh"
CI_SECRETS_CHECKER="$(cd "$PWD/../.." && pwd)/.github/scripts/check-ci-secrets.mjs"
REPO_ROOT="$(cd "$PWD/../.." && pwd)"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p .github/scripts .github/workflows
  cp "$CI_SECRETS_CHECKER" .github/scripts/check-ci-secrets.mjs
  cat > .github/ci-secrets.json <<'JSON'
[
  {
    "name": "PAT",
    "description": "Release token.",
    "scope": "repository",
    "requiredBy": [
      {
        "workflow": "release.yml",
        "job": "release"
      }
    ]
  }
]
JSON
  cat > .github/workflows/release.yml <<'YAML'
name: release
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - env:
          TOKEN: ${{ secrets.PAT }}
        run: echo ok
YAML
  out=$(PATH="$repo/bin:$PATH" bash "$POLICY_RUNNER" ci-secrets)
  assert_contains "ci secrets runner" "ci-secrets.json is in sync" "$out"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

(
  cd "$REPO_ROOT" || exit 1
  out=$(bash "$POLICY_RUNNER" config-schema)
  assert_contains "config schema runner" "config-schema: schemas are in sync" "$out"
)
pass_count=$((pass_count + 1))

repo=$(make_repo)
(
  cd "$repo" || exit 1
  mkdir -p scripts
  cat > scripts/release-suite.sh <<'SUITE'
#!/bin/sh
printf '%s\n' "$*"
SUITE
  chmod +x scripts/release-suite.sh

  out=$(bash "$POLICY_RUNNER" release-flow origin/main refs/substrate/pull-request-head release/v1.0.0)
  assert_contains "release flow runner" "verify-flow origin/main refs/substrate/pull-request-head release/v1.0.0" "$out"

  if missing_source_output=$(bash "$POLICY_RUNNER" release-flow origin/main refs/substrate/pull-request-head 2>&1); then
    fail "release flow runner" "expected a missing source branch to fail"
  fi
  assert_contains "release flow runner requires source branch" "missing source branch" "$missing_source_output"
)
rm -rf "$repo"
pass_count=$((pass_count + 1))

test_main
