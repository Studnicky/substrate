#!/usr/bin/env node

import { globSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  return {
    check: argv.includes('--check'),
    json: argv.includes('--json')
  };
}

function toPosixPath(path) {
  return path.split('\\').join('/');
}

function getPackageName(path) {
  const parts = toPosixPath(path).split('/');
  const index = parts.indexOf('packages');
  if (index === -1 || parts.length <= index + 1) {
    return '(root)';
  }
  return parts[index + 1] ?? '(root)';
}

function classify(file) {
  if (file.endsWith('.loop.spec.ts')) {
    return 'loop';
  }
  if (file.endsWith('.scenarios.json')) {
    return 'scenarios';
  }
  if (file.endsWith('.test.ts')) {
    return 'legacy';
  }
  return 'other';
}

function summarize(files) {
  const counts = {
    'legacy': 0,
    'loop': 0,
    'scenarios': 0
  };
  const packages = new Map();

  for (const file of files) {
    const shape = classify(file);
    if (!(shape in counts)) {
      continue;
    }
    counts[shape] += 1;

    const packageName = getPackageName(file);
    const current = packages.get(packageName) ?? { 'legacy': 0, 'loop': 0, 'scenarios': 0 };
    current[shape] += 1;
    packages.set(packageName, current);
  }

  return { counts, packages: [...packages.entries()].sort(([a], [b]) => a.localeCompare(b)) };
}

const options = parseArgs(process.argv.slice(2));
const files = globSync('packages/*/tests/**/*.{test.ts,loop.spec.ts,scenarios.json}', { 'cwd': ROOT_DIR })
  .map(toPosixPath)
  .toSorted();

const summary = summarize(files);

if (options.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`legacy test files: ${summary.counts.legacy}`);
  console.log(`loop suites: ${summary.counts.loop}`);
  console.log(`scenario fixtures: ${summary.counts.scenarios}`);

  const topLegacy = summary.packages
    .filter(([, stats]) => stats.legacy > 0)
    .toSorted(([, a], [, b]) => b.legacy - a.legacy)
    .slice(0, 12);

  if (topLegacy.length > 0) {
    console.log('packages with legacy test files:');
    for (const [packageName, stats] of topLegacy) {
      console.log(`- ${packageName}: ${stats.legacy} legacy, ${stats.loop} loop, ${stats.scenarios} scenario`);
    }
  }
}

if (options.check && summary.counts.legacy > 0) {
  console.error(`legacy test files remain: ${summary.counts.legacy}`);
  process.exitCode = 1;
}
