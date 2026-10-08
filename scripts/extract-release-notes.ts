#!/usr/bin/env node
/**
 * extract-release-notes.ts — render the pending changesets for this release
 * into one GitHub Release body. Changesets are the only changelog mechanism
 * this repo keeps: no package carries a maintained `CHANGELOG.md`, so this
 * script reads `.changeset/*.md` directly rather than a generated artifact.
 *
 * `pnpm changeset version` deletes every consumed `.changeset/*.md` file as
 * part of the version-bump commit, so this script must run against a
 * snapshot taken before that step, not against the live `.changeset/`
 * directory mid-release. `--changeset-dir <path>` points at that snapshot;
 * it defaults to `.changeset` for ad-hoc/local runs, where the pending files
 * are still present.
 *
 * Versioning is lockstep (`.changeset/config.json`'s `fixed` group), so every
 * changeset in this release shares the one root version heading.
 *
 * A GitHub Release body is capped at 125,000 characters and the API rejects the
 * whole request when a body exceeds it, so the notes are assembled against that
 * budget: entries are emitted in full until the next one would not fit, then the
 * rest are listed by name only, pointing at the release commit's diff.
 *
 * Usage:
 *   tsx scripts/extract-release-notes.ts > release_notes.md
 *   tsx scripts/extract-release-notes.ts --changeset-dir /tmp/changeset-snapshot > release_notes.md
 */

import { promises } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');

/** GitHub rejects a release whose body exceeds this many characters. */
const BODY_LIMIT = 125000;

/** Headroom for the overflow list appended after the last entry that fits. */
const OVERFLOW_RESERVE = 4000;

interface RootPackageManifestInterface {
  readonly 'repository'?: { readonly 'url'?: string };
  readonly 'version': string;
}

interface ChangesetEntryInterface {
  readonly 'affectedPackages': readonly string[];
  readonly 'name': string;
  readonly 'section': string;
}

function isValidRepositoryField(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if ('url' in value && value.url !== undefined && typeof value.url !== 'string') {
    return false;
  }
  return true;
}

function isRootPackageManifest(value: unknown): value is RootPackageManifestInterface {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('version' in value) || typeof value.version !== 'string') {
    return false;
  }
  if ('repository' in value && value.repository !== undefined && !isValidRepositoryField(value.repository)) {
    return false;
  }
  return true;
}

function resolveChangesetDir(argv: readonly string[]): string {
  const flagIndex = argv.indexOf('--changeset-dir');
  if (flagIndex === -1) {
    return join(REPO_ROOT, '.changeset');
  }
  const value = argv[flagIndex + 1];
  if (value === undefined) {
    throw new Error('extract-release-notes: --changeset-dir requires a path argument');
  }
  return value;
}

const CHANGESET_DIR = resolveChangesetDir(process.argv.slice(2));

const pkgRaw = await promises.readFile(join(REPO_ROOT, 'package.json'), 'utf8');
const parsedRootPkg: unknown = JSON.parse(pkgRaw);
if (!isRootPackageManifest(parsedRootPkg)) {
  throw new Error('package.json does not match the expected root manifest shape');
}
const rootPkg = parsedRootPkg;
const VERSION = rootPkg.version;

/** `owner/repo`, preferring the value Actions supplies over the manifest URL. */
function resolveRepositorySlug(): string {
  const fromEnv = process.env.GITHUB_REPOSITORY;
  if (typeof fromEnv === 'string' && fromEnv.includes('/')) {
    return fromEnv;
  }

  const url = rootPkg.repository?.url;
  if (typeof url !== 'string') {
    return '';
  }

  const match = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url);
  const slug = match === null ? '' : (match[1] ?? '');
  return slug;
}

const REPOSITORY_SLUG = resolveRepositorySlug();

/** Splits a changeset file's `---`-delimited frontmatter from its markdown body, and lists the packages named in that frontmatter. */
function parseChangesetFile(raw: string): { readonly 'affectedPackages': readonly string[]; readonly 'body': string } {
  const frontmatterMatch = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (frontmatterMatch === null) {
    return { 'affectedPackages': [], 'body': raw.trim() };
  }
  const [, frontmatter, body] = frontmatterMatch;
  const packageNames = [...(frontmatter ?? '').matchAll(/^"([^"]+)":\s*\S+/gm)].map((match) => { return match[1] ?? ''; });
  return { 'affectedPackages': packageNames.filter((name) => { return name !== ''; }), 'body': (body ?? '').trim() };
}

function compareEntryNames(left: ChangesetEntryInterface, right: ChangesetEntryInterface): number {
  return left.name.localeCompare(right.name);
}

async function readChangesetEntries(changesetDir: string): Promise<readonly ChangesetEntryInterface[]> {
  const entries = await promises.readdir(changesetDir, { 'withFileTypes': true });
  const changesetFiles = entries.filter((entry) => {
    const isMarkdownChangeset = entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md';
    return isMarkdownChangeset;
  });

  const parsed: ChangesetEntryInterface[] = [];
  for (const file of changesetFiles) {
    const raw = await promises.readFile(join(changesetDir, file.name), 'utf8');
    const { affectedPackages, body } = parseChangesetFile(raw);
    if (body === '') {
      continue;
    }
    const name = basename(file.name, '.md');
    const affectedLine = affectedPackages.length > 0 ? `*Affects: ${affectedPackages.join(', ')}*\n\n` : '';
    parsed.push({ 'affectedPackages': affectedPackages, 'name': name, 'section': `### ${name}\n\n${affectedLine}${body}` });
  }

  return parsed.toSorted(compareEntryNames);
}

const releasedEntries = await readChangesetEntries(CHANGESET_DIR);

if (releasedEntries.length === 0) {
  process.stdout.write(`Release v${VERSION}\n`);
  process.exit(0);
}

function compareReferenceUrl(): string {
  if (REPOSITORY_SLUG === '') {
    return '';
  }
  return `https://github.com/${REPOSITORY_SLUG}/commits/v${VERSION}/.changeset`;
}

const included: ChangesetEntryInterface[] = [];
const overflowed: ChangesetEntryInterface[] = [];
let budget = BODY_LIMIT - OVERFLOW_RESERVE;

for (const entry of releasedEntries) {
  const cost = entry.section.length + '\n\n'.length;
  if (overflowed.length === 0 && cost <= budget) {
    included.push(entry);
    budget -= cost;
    continue;
  }
  overflowed.push(entry);
}

const parts = included.map((entry) => { return entry.section; });

if (overflowed.length > 0) {
  const names = overflowed.map((entry) => { return `- \`${entry.name}\``; }).join('\n');
  const referenceUrl = compareReferenceUrl();
  const referenceLine = referenceUrl === '' ? '' : ` See the release commit's diff: ${referenceUrl}`;
  parts.push(
    '### Remaining changes\n\n' +
    `${overflowed.length} of ${releasedEntries.length} changes in this release are listed below rather than ` +
    `inlined, because a GitHub Release body is capped at ${BODY_LIMIT.toLocaleString('en-US')} characters.` +
    `${referenceLine}\n\n${names}`
  );
}

process.stdout.write(`${parts.join('\n\n')}\n`);
