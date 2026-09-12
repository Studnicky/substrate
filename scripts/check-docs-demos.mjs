#!/usr/bin/env node
/**
 * check-docs-demos — requires every consumer package page to declare a
 * RunnableExample backed by a source file in that package's examples directory.
 *
 * Each package page represents a published consumer surface. A static example
 * transclusion is useful reference material; the RunnableExample is the
 * executable counterpart consumers can edit and run in the documentation site.
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function resolveRepoRoot() {
  const [option, root] = process.argv.slice(2);

  if (option === undefined) {
    return defaultRepoRoot;
  }

  if (option === '--root' && root !== undefined && process.argv.length === 4) {
    return path.resolve(root);
  }

  throw new Error('Usage: check-docs-demos.mjs [--root path]');
}

function getRunnableSources(content) {
  const sources = [];
  const componentPattern = /<RunnableExample\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1[^>]*>/gu;

  for (const match of content.matchAll(componentPattern)) {
    const source = match[2];
    if (source !== undefined) {
      sources.push(source);
    }
  }

  return sources;
}

function sourceExists(repoRoot, source) {
  return existsSync(path.join(repoRoot, `${source}.ts`)) || existsSync(path.join(repoRoot, source, 'index.ts'));
}

const repoRoot = resolveRepoRoot();
const packagesRoot = path.join(repoRoot, 'packages');
const docsPackagesRoot = path.join(repoRoot, 'docs', 'packages');
const entries = await readdir(packagesRoot, { withFileTypes: true });
const packageNames = entries
  .filter((entry) => entry.isDirectory() && existsSync(path.join(packagesRoot, entry.name, 'package.json')))
  .map((entry) => entry.name)
  .toSorted((left, right) => left.localeCompare(right));
const violations = [];

for (const packageName of packageNames) {
  const docPath = path.join(docsPackagesRoot, `${packageName}.md`);

  if (!existsSync(docPath)) {
    violations.push(`docs/packages/${packageName}.md is missing a consumer package page.`);
    continue;
  }

  const content = await readFile(docPath, 'utf8');
  const sources = getRunnableSources(content);

  if (sources.length === 0) {
    violations.push(`docs/packages/${packageName}.md is missing a <RunnableExample> consumer demo.`);
    continue;
  }

  const packageExamplePrefix = `packages/${packageName}/examples/`;
  const validSource = sources.find((source) => source.startsWith(packageExamplePrefix) && sourceExists(repoRoot, source));

  if (validSource === undefined) {
    violations.push(`docs/packages/${packageName}.md must reference an existing ${packageExamplePrefix}*.ts source from <RunnableExample>.`);
  }

  for (const source of sources) {
    if (!source.startsWith(packageExamplePrefix) || !sourceExists(repoRoot, source)) {
      violations.push(`docs/packages/${packageName}.md references invalid runnable demo source ${source}.`);
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`check-docs-demos: ${String(violations.length)} runnable-demo violation(s).\n\n`);
  for (const violation of violations) {
    process.stderr.write(`  ${violation}\n`);
  }
  process.exit(1);
}

process.stdout.write(`check-docs-demos: OK (${String(packageNames.length)} consumer package page(s) declare a runnable demo).\n`);
