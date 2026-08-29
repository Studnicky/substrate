#!/bin/bash
set -eu

cd "$(dirname "$0")" || exit 1
# shellcheck source=_helpers.sh
source "_helpers.sh"

ACTION="$(cd "$PWD/../.." && pwd)/.github/actions/resolve-pull-request-head/action.yml"
action=$(cat "$ACTION")

assert_contains "submitted-head action is composite" "using: composite" "$action"
assert_contains "submitted-head action requires the base ref" "base-ref:" "$action"
assert_contains "submitted-head action requires the pull request number" "pull-request-number:" "$action"
assert_contains "submitted-head action requires the expected head SHA" "expected-head-sha:" "$action"
assert_contains "submitted-head action normalizes the base ref input" "BASE_REF: \${{ inputs.base-ref }}" "$action"
assert_contains "submitted-head action normalizes the pull request input" "PR_NUMBER: \${{ inputs.pull-request-number }}" "$action"
assert_contains "submitted-head action normalizes the expected SHA input" "EXPECTED_HEAD_SHA: \${{ inputs.expected-head-sha }}" "$action"
assert_contains "submitted-head action validates the pull request number" "pull request number must be numeric" "$action"
assert_contains "submitted-head action validates the expected SHA" "expected head SHA must be a full Git object ID" "$action"
assert_contains "submitted-head action fetches the protected target" 'git fetch --no-tags origin "$BASE_REF"' "$action"
assert_contains "submitted-head action fetches the submitted commit into a fixed ref" 'git fetch --no-tags origin "pull/$PR_NUMBER/head:refs/substrate/pull-request-head"' "$action"
assert_contains "submitted-head action resolves the fixed inspection ref" 'git rev-parse --verify refs/substrate/pull-request-head' "$action"
assert_contains "submitted-head action rejects an unexpected commit" '[ "$(git rev-parse --verify refs/substrate/pull-request-head)" != "$EXPECTED_HEAD_SHA" ]' "$action"
assert_not_contains "submitted-head action does not use contributor branch refs" 'refs/heads/$' "$action"
assert_not_contains "submitted-head action does not check out submitted files" "actions/checkout" "$action"

test_main
