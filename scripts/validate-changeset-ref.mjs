import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const changesetsRequire = createRequire(require.resolve("@changesets/cli/package.json"));
const { parseChangesetFile } = changesetsRequire("@changesets/parse");
const [baseRef, headRef] = process.argv.slice(2);

if (baseRef === undefined || headRef === undefined) {
  console.error("ERROR: Usage: validate-changeset-ref.mjs <base-ref> <head-ref>");
  process.exit(1);
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function treePaths(ref, directory) {
  const paths = git(["ls-tree", "-r", "-z", "--name-only", ref, "--", directory]);
  return paths.split("\0").filter((path) => path.length > 0);
}

function fileContents(ref, path) {
  return git(["show", `${ref}:${path}`]);
}

function workspacePackageNames(ref) {
  const names = new Set();

  for (const path of treePaths(ref, "packages")) {
    if (!/^packages\/[^/]+\/package\.json$/.test(path)) {
      continue;
    }

    let manifest;
    try {
      manifest = JSON.parse(fileContents(ref, path));
    } catch (error) {
      fail(`${path} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    if (manifest === null || Array.isArray(manifest) || typeof manifest !== "object") {
      fail(`${path} must contain a JSON object.`);
      continue;
    }

    if (typeof manifest.name !== "string" || manifest.name.trim().length === 0) {
      fail(`${path} property "name" must be a non-empty string.`);
      continue;
    }

    if (names.has(manifest.name)) {
      fail(`${path} duplicates workspace package name ${manifest.name}.`);
      continue;
    }

    names.add(manifest.name);
  }

  return names;
}

function changesetPaths(ref) {
  return treePaths(ref, ".changeset").filter((path) => /^\.changeset\/[^/]+\.md$/.test(path) && path !== ".changeset/README.md");
}

function validateChangeset(ref, path, packageNames) {
  let changeset;
  try {
    changeset = parseChangesetFile(fileContents(ref, path));
  } catch (error) {
    fail(`${path} is invalid: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (changeset.releases.length === 0) {
    fail(`${path} must declare at least one package bump.`);
    return;
  }

  for (const release of changeset.releases) {
    if (!packageNames.has(release.name)) {
      fail(`${path} references workspace package ${release.name}, which does not exist at ${ref}.`);
    }
  }
}

let headCommit;
try {
  git(["rev-parse", "--verify", `${baseRef}^{commit}`]);
  headCommit = git(["rev-parse", "--verify", `${headRef}^{commit}`]).trim();
} catch (error) {
  fail(`Cannot resolve Changeset validation refs: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const packageNames = workspacePackageNames(headCommit);
for (const path of changesetPaths(headCommit)) {
  validateChangeset(headCommit, path, packageNames);
}
