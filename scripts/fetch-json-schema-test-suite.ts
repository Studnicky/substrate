#!/usr/bin/env node
/**
 * Re-vendors the official JSON Schema Test Suite's draft2020-12 subset at a pinned commit.
 *
 * The suite is vendored rather than fetched at CI time: it is small (~1.1MB), changes rarely,
 * and a pinned copy keeps offline/fresh-clone builds and CI reproducible against the exact
 * fixtures a conformance run was measured against, instead of an upstream `main` that can
 * shift underneath an unrelated PR.
 *
 * Usage: tsx scripts/fetch-json-schema-test-suite.ts [commit-sha]
 * Defaults to the pin recorded in VENDORED_COMMIT.json.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR_DIR = resolve(ROOT_DIR, 'packages/entity/tests/conformance/vendor/json-schema-test-suite');
const REPOSITORY = 'json-schema-org/JSON-Schema-Test-Suite';
const PIN_PATH = resolve(VENDOR_DIR, 'VENDORED_COMMIT.json');

interface VendoredCommitManifestInterface {
  readonly 'commit': string;
  readonly 'fetchedAt': string;
  readonly 'fetchScript': string;
  readonly 'included': readonly string[];
  readonly 'repository': string;
}

const COMMIT_SHA_RE = /^[0-9a-f]{7,40}$/;

/** Rejects a commit that is not a bare hex SHA before it reaches a fetch URL or a filesystem path segment. */
function requireValidCommitSha(commit: string): string {
  if (!COMMIT_SHA_RE.test(commit)) {
    throw new Error(`fetch-json-schema-test-suite: '${commit}' is not a valid commit SHA`);
  }
  return commit;
}

function readPinnedCommit(): string {
  const manifest = JSON.parse(readFileSync(PIN_PATH, 'utf8')) as VendoredCommitManifestInterface;
  return requireValidCommitSha(manifest.commit);
}

async function fetchArchive(commit: string, archivePath: string): Promise<void> {
  const url = `https://github.com/${REPOSITORY}/archive/${commit}.tar.gz`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`fetch-json-schema-test-suite: ${response.status} ${response.statusText} for ${url}`);
  }
  const archiveBuffer = await response.arrayBuffer();
  writeFileSync(archivePath, Buffer.from(archiveBuffer));
}

function extractArchive(archivePath: string, destinationDir: string): void {
  const result = spawnSync('tar', ['xzf', archivePath, '-C', destinationDir], { 'stdio': 'inherit' });
  if (result.status !== 0) {
    throw new Error(`fetch-json-schema-test-suite: tar extraction failed with status ${String(result.status)}`);
  }
}

async function main(): Promise<void> {
  const cliCommit = process.argv[2];
  const commit = cliCommit === undefined ? readPinnedCommit() : requireValidCommitSha(cliCommit);
  const scratchDir = resolve(ROOT_DIR, '.tmp-json-schema-test-suite');
  rmSync(scratchDir, { 'force': true, 'recursive': true });
  mkdirSync(scratchDir, { 'recursive': true });
  const archivePath = resolve(scratchDir, 'suite.tar.gz');

  await fetchArchive(commit, archivePath);
  extractArchive(archivePath, scratchDir);

  const extractedDir = resolve(scratchDir, `JSON-Schema-Test-Suite-${commit}`);
  rmSync(resolve(VENDOR_DIR, 'tests'), { 'force': true, 'recursive': true });
  rmSync(resolve(VENDOR_DIR, 'remotes'), { 'force': true, 'recursive': true });
  mkdirSync(resolve(VENDOR_DIR, 'tests'), { 'recursive': true });

  cpSync(resolve(extractedDir, 'tests/draft2020-12'), resolve(VENDOR_DIR, 'tests/draft2020-12'), { 'recursive': true });
  cpSync(resolve(extractedDir, 'remotes'), resolve(VENDOR_DIR, 'remotes'), { 'recursive': true });
  cpSync(resolve(extractedDir, 'LICENSE'), resolve(VENDOR_DIR, 'LICENSE'));

  const manifest: VendoredCommitManifestInterface = {
    'commit': commit,
    'fetchedAt': new Date().toISOString(),
    'fetchScript': 'scripts/fetch-json-schema-test-suite.ts',
    'included': ['tests/draft2020-12', 'remotes'],
    'repository': REPOSITORY
  };
  writeFileSync(PIN_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  rmSync(scratchDir, { 'force': true, 'recursive': true });
  process.stderr.write(`fetch-json-schema-test-suite: vendored ${commit} into ${VENDOR_DIR}\n`);
}

await main();
