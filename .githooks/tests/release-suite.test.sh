#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

RELEASE_SUITE="$(cd "$PWD/../.." && pwd)/scripts/release-suite.sh"

assert_release_suite_routes_git_flow() {
  local repo node_binary

  repo=$(make_repo)
  node_binary=$(command -v node)
  (
    cd "$repo" || exit 1
    printf '%s\n' '{"name":"repo","version":"1.0.0"}' > package.json
    mkdir -p .changeset packages/a packages/b
    printf '%s\n' '{"name":"a","version":"1.0.0"}' > packages/a/package.json
    printf '%s\n' '{"name":"b","version":"1.0.0"}' > packages/b/package.json
    stub_cmd "$repo" pnpm 'printf "%s\n" "$*"'
    stub_cmd "$repo" node "case \"\$1\" in */scripts/validate-changeset-ref.mjs) exit 0 ;; esac
exec \"$node_binary\" \"\$@\""
    git add -A
    git commit -q -m "chore: base release state"
    git update-ref refs/remotes/origin/main HEAD
    git update-ref refs/remotes/origin/develop HEAD
    git switch -q -c feature/release-flow

    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-lockstep 1.0.0
    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" changeset-status origin/develop
    if PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-flow origin/develop refs/heads/feature/release-flow feature/release-flow 2>release-suite-delivery.out; then
      fail "delivery changeset" "expected delivery work without a changeset to fail"
    fi
    assert_contains "delivery changeset error" "must add a non-empty changeset" "$(cat release-suite-delivery.out)"

    printf '%s\n' '---' '"a": patch' '---' '' 'Releases package a.' > .changeset/release.md
    git add .changeset/release.md
    git commit -q -m "chore: release changeset"
    git branch release/v1.0.0
    git switch -q develop
    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-flow origin/develop refs/heads/feature/release-flow feature/release-flow
    git switch -q feature/release-flow
    if PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-flow origin/main refs/heads/release/v1.0.0 release/v1.0.0 2>release-suite-publish.out; then
      fail "release consumed changesets" "expected a release with a pending changeset to fail"
    fi

    git switch -q release/v1.0.0
    git rm -q .changeset/release.md
    printf '%s\n' '{"name":"repo","version":"2.0.0"}' > package.json
    printf '%s\n' '{"name":"a","version":"2.0.0"}' > packages/a/package.json
    printf '%s\n' '{"name":"b","version":"2.0.0"}' > packages/b/package.json
    git add -A
    git commit -q -m "chore: prepare release state"
    git branch hotfix/v2.0.1

    git switch -q -c feature/invalid-worktree origin/develop
    printf '%s\n' '{"name":"a","version":"0.9.0"}' > packages/a/package.json
    git add packages/a/package.json
    git commit -q -m "chore: create invalid worktree state"

    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-flow origin/main refs/heads/release/v1.0.0 release/v1.0.0
    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-flow origin/main refs/heads/hotfix/v2.0.1 hotfix/v2.0.1

    if PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-flow origin/main refs/heads/feature/release-flow feature/release-flow 2>release-suite-main-pair.out; then
      fail "main feature pair" "expected ordinary work targeting main to fail"
    fi
    assert_contains "main feature pair error" "cannot target main" "$(cat release-suite-main-pair.out)"

    if PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-flow origin/develop refs/heads/release/v1.0.0 release/v1.0.0 2>release-suite-develop-pair.out; then
      fail "develop release pair" "expected a release targeting develop to fail"
    fi
    assert_contains "develop release pair error" "must target main" "$(cat release-suite-develop-pair.out)"

    if PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-flow origin/staging refs/heads/feature/release-flow feature/release-flow 2>release-suite-unknown-pair.out; then
      fail "unknown flow pair" "expected an unknown target branch to fail"
    fi
    assert_contains "unknown flow pair error" "Unsupported Git flow pair" "$(cat release-suite-unknown-pair.out)"

  )
  rm -rf "$repo"
}

assert_release_suite_routes_canonical_backmerge() {
  local repo base_sha main_sha

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    mkdir -p packages/a
    printf '%s\n' '{"name":"repo","version":"1.0.0"}' > package.json
    printf '%s\n' '{"name":"a","version":"1.0.0"}' > packages/a/package.json
    git add -A
    git commit -q -m "chore: base development state"
    base_sha=$(git rev-parse HEAD)
    git update-ref refs/remotes/origin/develop "$base_sha"

    git switch -q -c main
    printf '%s\n' release > release.txt
    git add release.txt
    git commit -q -m "chore: release state"
    main_sha=$(git rev-parse HEAD)
    git update-ref refs/remotes/origin/main "$main_sha"

    git switch -q main
    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-flow origin/develop refs/heads/main main
    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-backmerge 1.0.0 origin/develop refs/heads/main
  )
  rm -rf "$repo"
}

assert_release_suite_rejects_non_ancestral_backmerge_result() {
  local repo main_sha squashed_develop_sha

  repo=$(make_repo)
  (
    cd "$repo" || exit 1
    printf '%s\n' '{"name":"repo","version":"1.0.0"}' > package.json
    mkdir -p packages/a
    printf '%s\n' '{"name":"a","version":"1.0.0"}' > packages/a/package.json
    git add -A
    git commit -q -m "chore: base development state"

    git switch -q -c main
    printf '%s\n' release > release.txt
    git add release.txt
    git commit -q -m "chore: release state"
    main_sha=$(git rev-parse HEAD)

    git switch -q develop
    git merge -q --squash main
    git commit -q -m "chore: squash main into develop"
    squashed_develop_sha=$(git rev-parse HEAD)

    if PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-backmerge-result "$main_sha" "$squashed_develop_sha" 2>release-suite-squashed-result.out; then
      fail "squashed backmerge result" "expected a non-ancestral merged result to fail"
    fi
    assert_contains "squashed backmerge result error" "must retain ${main_sha} as an ancestor" "$(cat release-suite-squashed-result.out)"

    git merge -q --no-ff main -m "chore: merge main into develop"
    PATH="$repo/bin:$PATH" /bin/bash "$RELEASE_SUITE" verify-backmerge-result "$main_sha" HEAD
  )
  rm -rf "$repo"
}

assert_release_suite_routes_git_flow
assert_release_suite_routes_canonical_backmerge
assert_release_suite_rejects_non_ancestral_backmerge_result
