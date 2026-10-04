import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

interface ParsedChangesetReleaseInterface {
  readonly 'name': string;
}

interface ParsedChangesetFileInterface {
  readonly 'releases': readonly ParsedChangesetReleaseInterface[];
  readonly 'summary': string;
}

interface ChangesetsParseModuleInterface {
  parseChangesetFile(contents: string): ParsedChangesetFileInterface;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  const result = typeof value === 'object' && value !== null && !Array.isArray(value);
  return result;
}

function isChangesetsParseModule(value: unknown): value is ChangesetsParseModuleInterface {
  const result = isRecord(value) && typeof value.parseChangesetFile === 'function';
  return result;
}

const require = createRequire(import.meta.url);
const changesetsRequire = createRequire(require.resolve('@changesets/cli/package.json'));
const changesetsParseModule: unknown = changesetsRequire('@changesets/parse');
if (!isChangesetsParseModule(changesetsParseModule)) {
  throw new Error('@changesets/parse does not export the expected parseChangesetFile function');
}
const { parseChangesetFile } = changesetsParseModule;
const [baseRef, headRef] = process.argv.slice(2);

if (baseRef === undefined || headRef === undefined) {
  console.error('ERROR: Usage: validate-changeset-ref.ts <base-ref> <head-ref>');
  process.exit(1);
}

function git(args: readonly string[]): string {
  const output = execFileSync('git', args, { 'encoding': 'utf8', 'stdio': ['ignore', 'pipe', 'pipe'] });
  return output;
}

function fail(message: string): void {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function treePaths(ref: string, directory: string): string[] {
  const paths = git(['ls-tree', '-r', '-z', '--name-only', ref, '--', directory]);
  const nonEmptyPaths = paths.split('\0').filter((path) => {
    const isNonEmpty = path.length > 0;
    return isNonEmpty;
  });
  return nonEmptyPaths;
}

function fileContents(ref: string, path: string): string {
  const contents = git(['show', `${ref}:${path}`]);
  return contents;
}

const PACKAGE_JSON_PATH_RE = /^packages\/[^/]+\/package\.json$/;
const CHANGESET_FILE_PATH_RE = /^\.changeset\/[^/]+\.md$/;

class ChangesetManifestParser {
  public static parse(ref: string, path: string): { readonly 'error': string } | { readonly 'value': unknown } {
    try {
      const value: unknown = JSON.parse(fileContents(ref, path));
      return { 'value': value };
    } catch (error) {
      const message = `${path} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`;
      return { 'error': message };
    }
  }
}

function workspacePackageNames(ref: string): Set<string> {
  const names = new Set<string>();
  const paths = treePaths(ref, 'packages');

  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index];
    if (path === undefined || !PACKAGE_JSON_PATH_RE.test(path)) {
      continue;
    }

    const parsed = ChangesetManifestParser.parse(ref, path);
    if ('error' in parsed) {
      fail(parsed.error);
      continue;
    }
    const manifest = parsed.value;

    if (!isRecord(manifest)) {
      fail(`${path} must contain a JSON object.`);
      continue;
    }

    if (typeof manifest.name !== 'string' || manifest.name.trim().length === 0) {
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

function changesetPaths(ref: string): string[] {
  const paths = treePaths(ref, '.changeset').filter((path) => {
    const isChangesetFile = CHANGESET_FILE_PATH_RE.test(path) && path !== '.changeset/README.md';
    return isChangesetFile;
  });
  return paths;
}

class ChangesetFileParser {
  public static parse(ref: string, path: string): ParsedChangesetFileInterface | null {
    try {
      const changeset = parseChangesetFile(fileContents(ref, path));
      return changeset;
    } catch (error) {
      fail(`${path} is invalid: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}

function validateChangeset(ref: string, path: string, packageNames: ReadonlySet<string>): void {
  const changeset = ChangesetFileParser.parse(ref, path);
  if (changeset === null) {
    return;
  }

  if (changeset.releases.length === 0) {
    fail(`${path} must declare at least one package bump.`);
    return;
  }

  for (let index = 0; index < changeset.releases.length; index += 1) {
    const release = changeset.releases[index];
    if (release === undefined) {
      continue;
    }
    if (!packageNames.has(release.name)) {
      fail(`${path} references workspace package ${release.name}, which does not exist at ${ref}.`);
    }
  }
}

let headCommit: string;
try {
  git(['rev-parse', '--verify', `${baseRef}^{commit}`]);
  headCommit = git(['rev-parse', '--verify', `${headRef}^{commit}`]).trim();
} catch (error) {
  fail(`Cannot resolve Changeset validation refs: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const packageNames = workspacePackageNames(headCommit);
const paths = changesetPaths(headCommit);
for (let index = 0; index < paths.length; index += 1) {
  const path = paths[index];
  if (path === undefined) {
    continue;
  }
  validateChangeset(headCommit, path, packageNames);
}
