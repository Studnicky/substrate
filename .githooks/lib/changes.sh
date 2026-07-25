#!/bin/bash
set -eu

_set_all_changed() {
    CHANGED_DOCS=true
    CHANGED_DOCS_ASSETS=true
    CHANGED_PACKAGES=true
    CHANGED_SCRIPTS=true
    CHANGED_TESTS=true
    CHANGED_CONFIG=true
    CHANGED_WORKFLOWS=true
    CHANGED_HOOKS=true
    CHANGED_SECURITY_CONFIG=true
    CHANGED_GENERATED_DOCS=true
    CHANGED_SOURCE=true
    CHANGED_LOCKFILES=true
    CHANGED_RELEASE=true
    CHANGED_CI=true
    CHANGED_AUDIT=true
    CHANGED_ANALYSIS=true
    CHANGED_DOCS_WORKFLOW=true
}

classify_changes() {
    local range="$1"
    local changed

    if ! changed=$(git diff --name-only "$range" 2>/dev/null); then
        echo "warning: classify_changes: git diff failed for '$range'; all paths assumed changed" >&2
        _set_all_changed
        return 0
    fi

    CHANGED_DOCS=false
    CHANGED_DOCS_ASSETS=false
    CHANGED_PACKAGES=false
    CHANGED_SCRIPTS=false
    CHANGED_TESTS=false
    CHANGED_CONFIG=false
    CHANGED_WORKFLOWS=false
    CHANGED_HOOKS=false
    CHANGED_SECURITY_CONFIG=false
    CHANGED_GENERATED_DOCS=false
    CHANGED_SOURCE=false
    CHANGED_LOCKFILES=false
    CHANGED_RELEASE=false
    CHANGED_CI=false
    CHANGED_AUDIT=false
    CHANGED_ANALYSIS=false
    CHANGED_DOCS_WORKFLOW=false
    CHANGED_UNIT_TESTS=false
    CHANGED_INTEGRATION_TESTS=false
    CHANGED_SMOKE_TESTS=false

    echo "$changed" | grep -qE '^(docs/|README\.md|CONTRIBUTING\.md|SECURITY\.md|CHANGELOG\.md)$' && CHANGED_DOCS=true
    echo "$changed" | grep -qE '^(docs/public/|assets/brand/)' && CHANGED_DOCS_ASSETS=true
    echo "$changed" | grep -qE '^packages/' && CHANGED_PACKAGES=true
    echo "$changed" | grep -qE '^scripts/' && CHANGED_SCRIPTS=true
    echo "$changed" | grep -qE '^(tests/|packages/.+/tests/|\.githooks/tests/)' && CHANGED_TESTS=true
    echo "$changed" | grep -qE '^packages/.+/tests/unit/' && CHANGED_UNIT_TESTS=true
    echo "$changed" | grep -qE '^packages/.+/tests/integration/' && CHANGED_INTEGRATION_TESTS=true
    echo "$changed" | grep -qE '^packages/.+/tests/smoke/' && CHANGED_SMOKE_TESTS=true
    echo "$changed" | grep -qE '^(\.github/|\.githooks/|tsconfig(\..+)?\.json$|eslint\..+|oxlint\..+|lint-staged\.config\.js$|package\.json$|pnpm-workspace\.yaml$)' && CHANGED_CONFIG=true
    echo "$changed" | grep -qE '^\.github/(workflows|actions)/' && CHANGED_WORKFLOWS=true
    echo "$changed" | grep -qE '^\.githooks/' && CHANGED_HOOKS=true
    echo "$changed" | grep -qE '^(\.github/(workflows/(audit|codeql|dependency-review|gitleaks|security|security-audit|semgrep)\.yml|ci-secrets\.(json|schema\.json)$|scripts/check-ci-secrets\.mjs$)|\.gitleaks\.toml$|\.semgrepignore$)' && CHANGED_SECURITY_CONFIG=true
    echo "$changed" | grep -qE '^(docs/dependency-graph\.md|docs/public/og-image.*\.(svg|png|svg\.template)$|scripts/(dependency-diagram|stamp-version)\.mjs$|assets/brand/)' && CHANGED_GENERATED_DOCS=true
    echo "$changed" | grep -qE '(^|/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$' && CHANGED_LOCKFILES=true
    echo "$changed" | grep -qE '^(\.changeset/|CHANGELOG\.md|package\.json$|packages/.+/package\.json$|docs/public/og-image.*\.(svg|png|svg\.template)$)' && CHANGED_RELEASE=true

    if [ "$CHANGED_PACKAGES" = true ] || [ "$CHANGED_SCRIPTS" = true ] || [ "$CHANGED_TESTS" = true ] || [ "$CHANGED_LOCKFILES" = true ]; then
        CHANGED_SOURCE=true
    fi

    if [ "$CHANGED_SOURCE" = true ] || [ "$CHANGED_CONFIG" = true ]; then
        CHANGED_CI=true
        CHANGED_ANALYSIS=true
    fi

    if [ "$CHANGED_LOCKFILES" = true ] || [ "$CHANGED_SOURCE" = true ] || [ "$CHANGED_SECURITY_CONFIG" = true ]; then
        CHANGED_AUDIT=true
    fi

    if [ "$CHANGED_DOCS" = true ] || [ "$CHANGED_DOCS_ASSETS" = true ] || [ "$CHANGED_GENERATED_DOCS" = true ] || [ "$CHANGED_SOURCE" = true ]; then
        CHANGED_DOCS_WORKFLOW=true
    fi

    return 0
}
