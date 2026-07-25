#!/usr/bin/env bash
set -euo pipefail

root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Not inside a git repo." >&2; exit 1; }
cd "$root"

# shellcheck source=.githooks/lib/worktree-cleanup.sh
source "$root/.githooks/lib/worktree-cleanup.sh"

git fetch --prune --quiet origin 2>/dev/null || echo "  ⚠ fetch --prune failed — stale upstream detection may be incomplete." >&2

dry_run="false"
[ "${1:-}" = "--dry-run" ] && dry_run="true"

cleanup_stale_worktrees "$dry_run"
