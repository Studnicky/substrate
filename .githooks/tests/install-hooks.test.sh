#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

INSTALLER="$(cd "$PWD/../.." && pwd)/scripts/install-hooks.sh"

make_repo_with_hooks() {
    local tmp
    tmp=$(mktemp -d)
    (
        cd "$tmp" || exit 1
        git init -q -b develop
        git config user.email test@example.com
        git config user.name Test
        mkdir -p .githooks/lib
        cat > .githooks/pre-commit <<'HOOK'
#!/bin/bash
echo "real pre-commit"
HOOK
        cat > .githooks/pre-push <<'HOOK'
#!/bin/bash
echo "real pre-push"
HOOK
        echo '# helper' > .githooks/lib/_helpers.sh
        chmod +x .githooks/pre-commit .githooks/pre-push
        git add -A
        git commit -q -m baseline
    )
    echo "$tmp"
}

assert_install() {
    local repo
    repo=$(make_repo_with_hooks)
    (
        cd "$repo" || exit 1
        env -u CI -u GITHUB_ACTIONS bash "$INSTALLER" >/dev/null
    )
    [ -x "$repo/.git/hooks/pre-commit" ] || fail "install-hooks" "pre-commit forwarder missing"
    [ -x "$repo/.git/hooks/pre-push" ] || fail "install-hooks" "pre-push forwarder missing"
    grep -q -- '--show-toplevel' "$repo/.git/hooks/pre-commit" || fail "install-hooks" "forwarder body missing show-toplevel"
    rm -rf "$repo"
    pass_count=$((pass_count + 1))
}

assert_local_hooks_path_is_cleared() {
    local repo
    repo=$(make_repo_with_hooks)
    (
        cd "$repo" || exit 1
        git config --local core.hooksPath .githooks
        env -u CI -u GITHUB_ACTIONS bash "$INSTALLER" >/dev/null
        if git config --local --get core.hooksPath >/dev/null 2>&1; then
            fail "install-hooks hooksPath" "local core.hooksPath was not cleared"
        fi
    )
    rm -rf "$repo"
    pass_count=$((pass_count + 1))
}

assert_install
assert_local_hooks_path_is_cleared
test_main
