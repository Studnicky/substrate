#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"
HOOKS_DIR="$(cd "$PWD/.." && pwd)"
export HOOKS_DIR
# shellcheck source=../lib/semgrep-check.sh
source "../lib/semgrep-check.sh"

repo=$(make_repo)
(
  cd "$repo" || exit 1
  echo "const x = 1" > file.ts
  git add file.ts
  git commit -q -m "add file"
  stub_cmd "$repo" semgrep 'exit 0'
  PATH="$repo/bin:$PATH" check_semgrep_findings "HEAD~1..HEAD"
)
rm -rf "$repo"
test_main
