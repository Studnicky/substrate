#!/usr/bin/env node
/**
 * extract-release-notes.mjs — concatenate each package's CHANGELOG.md section
 * for the current root package.json#version into one GitHub Release body.
 *
 * Versioning is lockstep (`.changeset/config.json`'s `fixed` group), so every
 * published package shares the same version heading; this script collects
 * whichever packages actually have a non-empty entry for it and skips the rest.
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

const pkgRaw = await fs.readFile(join(REPO_ROOT, 'package.json'), 'utf8');
const VERSION = JSON.parse(pkgRaw).version;

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

const entries = await fs.readdir(PACKAGES_ROOT, { withFileTypes: true });
const packageDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

const sections = [];

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

  sections.push(`### ${pkgName}\n\n${body}`);
}

const notes = sections.length > 0
  ? sections.join('\n\n')
  : `Release v${VERSION}`;

process.stdout.write(`${notes}\n`);
