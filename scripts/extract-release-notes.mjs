#!/usr/bin/env node
/**
 * extract-release-notes.mjs — concatenate each package's CHANGELOG.md section
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
 *   node scripts/extract-release-notes.mjs > release_notes.md
 */

import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');
const PACKAGES_ROOT = join(REPO_ROOT, 'packages');

/** GitHub rejects a release whose body exceeds this many characters. */
const BODY_LIMIT = 125000;

/** Headroom for the overflow list appended after the last section that fits. */
const OVERFLOW_RESERVE = 4000;

const pkgRaw = await fs.readFile(join(REPO_ROOT, 'package.json'), 'utf8');
const rootPkg = JSON.parse(pkgRaw);
const VERSION = rootPkg.version;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const HEADING_RE = new RegExp(`^## \\[?${escapeRegExp(VERSION)}\\]?`);

function extractSection(changelog) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => HEADING_RE.test(line));

  if (start === -1) {
    return '';
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

  return body;
}

/** `owner/repo`, preferring the value Actions supplies over the manifest URL. */
function resolveRepositorySlug() {
  const fromEnv = process.env.GITHUB_REPOSITORY;
  if (typeof fromEnv === 'string' && fromEnv.includes('/')) {
    return fromEnv;
  }

  const url = rootPkg.repository?.url;
  if (typeof url !== 'string') {
    return '';
  }

  const match = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url);
  return match === null ? '' : match[1];
}

const REPOSITORY_SLUG = resolveRepositorySlug();

function changelogLink(dir, pkgName) {
  if (REPOSITORY_SLUG === '') {
    return `- \`${pkgName}\` — \`packages/${dir}/CHANGELOG.md\``;
  }

  return `- [\`${pkgName}\`](https://github.com/${REPOSITORY_SLUG}/blob/v${VERSION}/packages/${dir}/CHANGELOG.md)`;
}

const entries = await fs.readdir(PACKAGES_ROOT, { withFileTypes: true });
const packageDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

const released = [];

for (const dir of packageDirs) {
  const changelogPath = join(PACKAGES_ROOT, dir, 'CHANGELOG.md');
  const pkgJsonPath = join(PACKAGES_ROOT, dir, 'package.json');

  let changelog;
  try {
    changelog = await fs.readFile(changelogPath, 'utf8');
  } catch {
    continue;
  }

  const body = extractSection(changelog);
  if (body === '') {
    continue;
  }

  const pkgJsonRaw = await fs.readFile(pkgJsonPath, 'utf8');
  const pkgName = JSON.parse(pkgJsonRaw).name;

  released.push({ dir, pkgName, section: `### ${pkgName}\n\n${body}` });
}

if (released.length === 0) {
  process.stdout.write(`Release v${VERSION}\n`);
  process.exit(0);
}

const included = [];
const overflowed = [];
let budget = BODY_LIMIT - OVERFLOW_RESERVE;

for (const entry of released) {
  const cost = entry.section.length + '\n\n'.length;
  if (overflowed.length === 0 && cost <= budget) {
    included.push(entry);
    budget -= cost;
    continue;
  }

  overflowed.push(entry);
}

const parts = included.map((entry) => entry.section);

if (overflowed.length > 0) {
  const links = overflowed.map((entry) => changelogLink(entry.dir, entry.pkgName)).join('\n');
  parts.push(
    `### Remaining packages\n\n` +
    `${overflowed.length} of ${released.length} packages released at this version are listed below rather than ` +
    `inlined, because a GitHub Release body is capped at ${BODY_LIMIT.toLocaleString('en-US')} characters. ` +
    `Their notes are in their own changelogs.\n\n${links}`
  );
}

process.stdout.write(`${parts.join('\n\n')}\n`);
