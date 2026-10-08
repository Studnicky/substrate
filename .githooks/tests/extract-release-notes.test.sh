#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

REPO_ROOT="$(cd "$PWD/../.." && pwd)"
BODY_LIMIT=125000

# Builds a workspace at root version $1 whose `.changeset/` carries
# $3 changeset files, each with a $2-character body, then prints the directory.
make_workspace() {
  local version="$1" body_size="$2" changeset_count="$3"
  local tmp index body
  tmp=$(mktemp -d)
  mkdir -p "$tmp/scripts" "$tmp/.changeset"
  cp "$REPO_ROOT/scripts/extract-release-notes.ts" "$tmp/scripts/extract-release-notes.ts"

  printf '{"name":"@test/root","version":"%s","type":"module","repository":{"type":"git","url":"git+https://github.com/Test/workspace.git"}}\n' \
    "$version" > "$tmp/package.json"

  body=$(head -c "$body_size" < /dev/zero | tr '\0' 'x')
  printf '# Changesets\n\nIgnored by the extractor, like every other non-changeset file here.\n' \
    > "$tmp/.changeset/README.md"
  if [ "$changeset_count" -gt 0 ]; then
    for index in $(seq 1 "$changeset_count"); do
      printf -- '---\n"@test/pkg%s": patch\n---\n\n%s\n' "$index" "$body" \
        > "$tmp/.changeset/change-$index.md"
    done
  fi

  printf '%s\n' "$tmp"
}

# A release that fits inlines every changeset and adds no overflow list.
workspace=$(make_workspace 1.0.0 200 3)
(
  cd "$workspace" || exit 1
  out=$(node scripts/extract-release-notes.ts)

  assert_contains "small release inlines first changeset" "### change-1" "$out"
  assert_contains "small release inlines last changeset" "### change-3" "$out"
  assert_contains "small release notes the affected package" "@test/pkg1" "$out"
  assert_not_contains "small release has no overflow list" "Remaining changes" "$out"
  assert_not_contains "small release skips the changeset README" "Ignored by the extractor" "$out"
)
rm -rf "$workspace"

# A release whose entries exceed the cap stays publishable: the body fits, and
# every changeset that was not inlined is named instead of dropped.
workspace=$(make_workspace 2.0.0 20000 20)
(
  cd "$workspace" || exit 1
  out=$(node scripts/extract-release-notes.ts)
  size=${#out}

  if [ "$size" -gt "$BODY_LIMIT" ]; then
    fail "oversized release fits the cap" "body is $size characters, cap is $BODY_LIMIT"
  fi

  assert_contains "oversized release inlines what fits" "### change-1" "$out"
  assert_contains "oversized release lists the remainder" "Remaining changes" "$out"

  # Every changeset appears exactly once, inlined or named — none silently drops.
  index=1
  while [ "$index" -le 20 ]; do
    assert_contains "changeset change-$index is accounted for" "change-$index" "$out"
    index=$((index + 1))
  done

  assert_contains "overflow entries point at the tagged .changeset history" \
    "https://github.com/Test/workspace/commits/v2.0.0/.changeset" "$out"
)
rm -rf "$workspace"

# With no pending changesets, the body names the release anyway.
workspace=$(make_workspace 3.0.0 100 0)
(
  cd "$workspace" || exit 1
  out=$(node scripts/extract-release-notes.ts)

  assert_eq "empty release names the version" "Release v3.0.0" "$out"
)
rm -rf "$workspace"

# `--changeset-dir` points the extractor at a snapshot taken before
# `pnpm changeset version` deletes the consumed changeset files.
workspace=$(make_workspace 4.0.0 100 2)
(
  cd "$workspace" || exit 1
  snapshot=$(mktemp -d)
  cp .changeset/*.md "$snapshot/"
  rm .changeset/*.md
  out=$(node scripts/extract-release-notes.ts --changeset-dir "$snapshot")

  assert_contains "snapshot dir is read when the live directory is empty" "### change-1" "$out"
  rm -rf "$snapshot"
)
rm -rf "$workspace"
