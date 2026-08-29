#!/usr/bin/env bash
set -euo pipefail

release_root_version() {
  release_manifest_value "${1:-}" package.json version
}

release_file_contents() {
  local ref="$1" path="$2"
  if [ -n "$ref" ]; then
    git show "${ref}:${path}"
  else
    cat "$path"
  fi
}

release_manifest_values() {
  local ref="$1" path="$2"
  shift 2

  release_file_contents "$ref" "$path" | node -e '
    const [path, ...properties] = process.argv.slice(1);
    let source = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      source += chunk;
    });
    process.stdin.on("end", () => {
      let manifest;
      try {
        manifest = JSON.parse(source);
      } catch (error) {
        console.error(`::error::${path} contains invalid JSON: ${error.message}`);
        process.exitCode = 1;
        return;
      }

      if (manifest === null || Array.isArray(manifest) || typeof manifest !== "object") {
        console.error(`::error::${path} must contain a JSON object.`);
        process.exitCode = 1;
        return;
      }

      for (const property of properties) {
        if (typeof manifest[property] !== "string" || manifest[property].length === 0) {
          console.error(`::error::${path} property "${property}" must be a non-empty string.`);
          process.exitCode = 1;
          return;
        }
      }

      process.stdout.write(`${properties.map((property) => manifest[property]).join("\t")}\n`);
    });
  ' "$path" "$@"
}

release_manifest_value() {
  local ref="$1" path="$2" property="$3"
  release_manifest_values "$ref" "$path" "$property"
}

release_workspace_manifest_identity() {
  local ref="$1" path="$2"
  release_manifest_values "$ref" "$path" name version
}

release_workspace_manifest_paths() {
  local ref="$1"
  if [ -n "$ref" ]; then
    git ls-tree -r --name-only "$ref" -- packages | awk -F/ '$1 == "packages" && NF == 3 && $3 == "package.json"'
    return
  fi

  find packages -mindepth 2 -maxdepth 2 -type f -name package.json
}

release_pending_changeset_paths() {
  local ref="$1" changeset_path
  if [ -z "$ref" ]; then
    if [ -d .changeset ]; then
      while IFS= read -r changeset_path; do
        if release_changeset_is_nonempty "$ref" "$changeset_path"; then
          printf '%s\n' "$changeset_path"
        fi
      done < <(find .changeset -maxdepth 1 -type f -name '*.md' ! -name 'README.md')
    fi
    return
  fi

  while IFS= read -r changeset_path; do
    if release_changeset_is_nonempty "$ref" "$changeset_path"; then
      printf '%s\n' "$changeset_path"
    fi
  done < <(git ls-tree -r --name-only "$ref" -- .changeset | awk -F/ '$1 == ".changeset" && NF == 2 && $2 ~ /\.md$/ && $2 != "README.md"')
}

release_changeset_is_nonempty() {
  local ref="$1" changeset_path="$2"
  if [ -n "$ref" ]; then
    git cat-file -e "${ref}:${changeset_path}" 2>/dev/null && [ "$(git cat-file -s "${ref}:${changeset_path}")" -gt 0 ]
    return
  fi

  [ -s "$changeset_path" ]
}

pending_changeset_count() {
  local ref="${1:-}"

  release_pending_changeset_paths "$ref" | wc -l | tr -d ' '
}

assert_pending_changesets_are_valid() {
  local base_ref="$1" head_ref="${2:-}" head_sha checked_out_sha worktree validation_status

  if [ -z "$head_ref" ]; then
    env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_PREFIX pnpm changeset status --since="$base_ref"
    return
  fi

  if ! head_sha=$(git rev-parse --verify "${head_ref}^{commit}"); then
    echo "::error::Cannot resolve changeset validation ref ${head_ref}." >&2
    return 1
  fi

  checked_out_sha=$(git rev-parse --verify HEAD)
  if [ "$head_sha" = "$checked_out_sha" ]; then
    env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_PREFIX pnpm changeset status --since="$base_ref"
    return
  fi

  worktree=$(mktemp -d "${TMPDIR:-/tmp}/substrate-release-gates.XXXXXX")
  if ! git worktree add --quiet --detach "$worktree" "$head_sha"; then
    rmdir "$worktree" 2>/dev/null || true
    echo "::error::Cannot create an isolated worktree for changeset validation." >&2
    return 1
  fi

  if (
    cd "$worktree"
    env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_PREFIX pnpm changeset status --since="$base_ref"
  ); then
    validation_status=0
  else
    validation_status=1
  fi

  if ! git worktree remove "$worktree"; then
    echo "::error::Cannot remove the isolated changeset validation worktree." >&2
    return 1
  fi

  return "$validation_status"
}

assert_workspace_lockstep_version() {
  local expected_version="$1" ref="${2:-}" mismatch pkg_json pkg_identity pkg_name pkg_ver
  mismatch=0

  while IFS= read -r pkg_json; do
    if ! pkg_identity=$(release_workspace_manifest_identity "$ref" "$pkg_json"); then
      mismatch=1
      continue
    fi
    IFS=$'\t' read -r pkg_name pkg_ver <<< "$pkg_identity"
    if [ "$pkg_ver" != "$expected_version" ]; then
      echo "::error::${pkg_name}@${pkg_ver} is not at version ${expected_version}" >&2
      mismatch=1
    fi
  done < <(release_workspace_manifest_paths "$ref")

  return "$mismatch"
}

assert_no_pending_changesets() {
  local ref="${1:-}" pending
  pending=$(pending_changeset_count "$ref")
  if [ "$pending" -ne 0 ]; then
    echo "::error::${pending} unconsumed changeset(s) remain in .changeset/ — run 'pnpm changeset:version' and commit the result before tagging." >&2
    return 1
  fi
}

assert_changeset_required() {
  local base_ref="$1" head_ref="${2:-HEAD}" changeset_path has_added_changeset
  has_added_changeset=false

  while IFS= read -r -d '' changeset_path; do
    case "$changeset_path" in
      .changeset/README.md) ;;
      .changeset/*.md)
        if release_changeset_is_nonempty "$head_ref" "$changeset_path"; then
          has_added_changeset=true
          break
        fi
        ;;
    esac
  done < <(git diff --name-only -z --diff-filter=A "$base_ref...$head_ref" -- .changeset)

  if [ "$has_added_changeset" = "false" ]; then
    echo "ERROR: This PR must add a non-empty changeset." >&2
    echo "Run 'pnpm changeset' and commit the generated .changeset/*.md file before merging into develop." >&2
    return 1
  fi

  if ! assert_pending_changesets_are_valid "$base_ref" "$head_ref"; then
    echo "ERROR: Pending changeset input is invalid." >&2
    return 1
  fi
}
