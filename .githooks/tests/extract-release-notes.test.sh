#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

REPO_ROOT="$(cd "$PWD/../.." && pwd)"
BODY_LIMIT=125000

# Builds a workspace whose package changelogs each carry a $2-character entry
# for version $1, then prints the directory.
make_workspace() {
  local version="$1" section_size="$2" package_count="$3"
  local tmp index body
  tmp=$(mktemp -d)
  mkdir -p "$tmp/scripts" "$tmp/packages"
  cp "$REPO_ROOT/scripts/extract-release-notes.mjs" "$tmp/scripts/extract-release-notes.mjs"

  printf '{"name":"@test/root","version":"%s","repository":{"type":"git","url":"git+https://github.com/Test/workspace.git"}}\n' \
    "$version" > "$tmp/package.json"

  body=$(head -c "$section_size" < /dev/zero | tr '\0' 'x')
  for index in $(seq 1 "$package_count"); do
    mkdir -p "$tmp/packages/pkg$index"
    printf '{"name":"@test/pkg%s","version":"%s"}\n' "$index" "$version" > "$tmp/packages/pkg$index/package.json"
    printf '# Changelog\n\n## %s\n\n%s\n\n## 0.9.0\n\nolder\n' "$version" "$body" \
      > "$tmp/packages/pkg$index/CHANGELOG.md"
  done

  printf '%s\n' "$tmp"
}

# A release that fits inlines every package and adds no overflow list.
workspace=$(make_workspace 1.0.0 200 3)
(
  cd "$workspace" || exit 1
  out=$(node scripts/extract-release-notes.mjs)

  assert_contains "small release inlines first package" "### @test/pkg1" "$out"
  assert_contains "small release inlines last package" "### @test/pkg3" "$out"
  assert_not_contains "small release has no overflow list" "Remaining packages" "$out"
)
rm -rf "$workspace"

# A release whose sections exceed the cap stays publishable: the body fits, and
# every package that was not inlined is linked instead of dropped.
workspace=$(make_workspace 2.0.0 20000 20)
(
  cd "$workspace" || exit 1
  out=$(node scripts/extract-release-notes.mjs)
  size=${#out}

  if [ "$size" -gt "$BODY_LIMIT" ]; then
    fail "oversized release fits the cap" "body is $size characters, cap is $BODY_LIMIT"
  fi

  assert_contains "oversized release inlines what fits" "### @test/pkg1" "$out"
  assert_contains "oversized release lists the remainder" "Remaining packages" "$out"

  # Every package appears exactly once, inlined or linked — none silently drops.
  index=1
  while [ "$index" -le 20 ]; do
    assert_contains "package pkg$index is accounted for" "@test/pkg$index" "$out"
    index=$((index + 1))
  done

  assert_contains "overflow entries link to the tagged changelog" \
    "https://github.com/Test/workspace/blob/v2.0.0/packages/" "$out"
)
rm -rf "$workspace"

# With no changelog entry for the version, the body names the release anyway.
workspace=$(make_workspace 3.0.0 100 2)
(
  cd "$workspace" || exit 1
  sed -i.bak 's/^## 3\.0\.0$/## 2.0.0/' packages/pkg1/CHANGELOG.md packages/pkg2/CHANGELOG.md
  out=$(node scripts/extract-release-notes.mjs)

  assert_eq "empty release names the version" "Release v3.0.0" "$out"
)
rm -rf "$workspace"

test_main
