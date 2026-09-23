#!/usr/bin/env node
/**
 * extract-release-notes.ts — concatenate each package's CHANGELOG.md section
 * for the current root package.json#version into one GitHub Release body.
 *
 * Versioning is lockstep (`.changeset/config.json`'s `fixed` group), so every
 * published package shares the same version heading; this script collects
 * whichever packages actually have a non-empty entry for it and skips the rest.
 *
 * A GitHub Release body is capped at 125,000 characters and the API rejects the
 * whole request when a body exceeds it, so the notes are assembled against that
 * budget: sections are emitted in full until the next one would not fit, and
 * every package that did not fit is listed with a link to its CHANGELOG at this
 * release's tag. A large release therefore publishes readable notes rather than
 * failing after the packages are already on the registry.
 *
 * Usage:
 *   tsx scripts/extract-release-notes.ts > release_notes.md
 */

import { promises } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');
const PACKAGES_ROOT = join(REPO_ROOT, 'packages');

/** GitHub rejects a release whose body exceeds this many characters. */
const BODY_LIMIT = 125000;

/** Headroom for the overflow list appended after the last section that fits. */
const OVERFLOW_RESERVE = 4000;

interface RootPackageManifestInterface {
  readonly 'repository'?: { readonly 'url'?: string };
  readonly 'version': string;
}

interface ReleasedPackageEntryInterface {
  readonly 'dir': string;
  readonly 'pkgName': string;
  readonly 'section': string;
}

function isRootPackageManifest(value: unknown): value is RootPackageManifestInterface {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('version' in value) || typeof value.version !== 'string') {
    return false;
  }
  if ('repository' in value && value.repository !== undefined) {
    const repository = value.repository;
    if (typeof repository !== 'object' || repository === null) {
      return false;
    }
    if ('url' in repository && repository.url !== undefined && typeof repository.url !== 'string') {
      return false;
    }
  }
  return true;
}

const pkgRaw = await promises.readFile(join(REPO_ROOT, 'package.json'), 'utf8');
const parsedRootPkg: unknown = JSON.parse(pkgRaw);
if (!isRootPackageManifest(parsedRootPkg)) {
  throw new Error('package.json does not match the expected root manifest shape');
}
const rootPkg = parsedRootPkg;
const VERSION = rootPkg.version;

function escapeRegExp(value: string): string {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped;
}

const HEADING_RE = new RegExp(`^## \\[?${escapeRegExp(VERSION)}\\]?`);

function extractSection(changelog: string): string {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => {
    const isHeading = HEADING_RE.test(line);
    return isHeading;
  });

  if (start === -1) {
    return '';
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => {
    const isNextHeading = line.startsWith('## ');
    return isNextHeading;
  });
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

  return body;
}

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

function changelogLink(dir: string, pkgName: string): string {
  if (REPOSITORY_SLUG === '') {
    return `- \`${pkgName}\` — \`packages/${dir}/CHANGELOG.md\``;
  }

  return `- [\`${pkgName}\`](https://github.com/${REPOSITORY_SLUG}/blob/v${VERSION}/packages/${dir}/CHANGELOG.md)`;
}

class ChangelogReader {
  public static async readOrNull(changelogPath: string): Promise<string | null> {
    try {
      const changelog = await promises.readFile(changelogPath, 'utf8');
      return changelog;
    } catch {
      return null;
    }
  }
}

const entries = await promises.readdir(PACKAGES_ROOT, { 'withFileTypes': true });
const directoryNames: string[] = [];
for (let index = 0; index < entries.length; index += 1) {
  const entry = entries[index];
  if (entry === undefined) {
    continue;
  }
  if (entry.isDirectory()) {
    directoryNames.push(entry.name);
  }
}
const packageDirs = directoryNames.toSorted();

const released: ReleasedPackageEntryInterface[] = [];

for (let index = 0; index < packageDirs.length; index += 1) {
  const dir = packageDirs[index];
  if (dir === undefined) {
    continue;
  }
  const changelogPath = join(PACKAGES_ROOT, dir, 'CHANGELOG.md');
  const pkgJsonPath = join(PACKAGES_ROOT, dir, 'package.json');

  const changelog = await ChangelogReader.readOrNull(changelogPath);
  if (changelog === null) {
    continue;
  }

  const body = extractSection(changelog);
  if (body === '') {
    continue;
  }

  const pkgJsonRaw = await promises.readFile(pkgJsonPath, 'utf8');
  const pkgName = (JSON.parse(pkgJsonRaw) as { 'name': string }).name;

  released.push({ 'dir': dir, 'pkgName': pkgName, 'section': `### ${pkgName}\n\n${body}` });
}

if (released.length === 0) {
  process.stdout.write(`Release v${VERSION}\n`);
  process.exit(0);
}

const included: ReleasedPackageEntryInterface[] = [];
const overflowed: ReleasedPackageEntryInterface[] = [];
let budget = BODY_LIMIT - OVERFLOW_RESERVE;

for (let index = 0; index < released.length; index += 1) {
  const entry = released[index];
  if (entry === undefined) {
    continue;
  }
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
  const links = overflowed.map((entry) => {
    const link = changelogLink(entry.dir, entry.pkgName);
    return link;
  }).join('\n');
  parts.push(
    '### Remaining packages\n\n' +
    `${overflowed.length} of ${released.length} packages released at this version are listed below rather than ` +
    `inlined, because a GitHub Release body is capped at ${BODY_LIMIT.toLocaleString('en-US')} characters. ` +
    `Their notes are in their own changelogs.\n\n${links}`
  );
}

process.stdout.write(`${parts.join('\n\n')}\n`);
