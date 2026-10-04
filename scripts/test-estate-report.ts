#!/usr/bin/env node

import { globSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface CliOptionsInterface {
  readonly 'check': boolean;
  readonly 'json': boolean;
}

interface ShapeCountsInterface {
  readonly 'legacy': number;
  readonly 'loop': number;
  readonly 'scenarios': number;
}

interface SummaryInterface {
  readonly 'counts': ShapeCountsInterface;
  readonly 'packages': readonly (readonly [string, ShapeCountsInterface])[];
}

function parseArgs(argv: readonly string[]): CliOptionsInterface {
  return {
    'check': argv.includes('--check'),
    'json': argv.includes('--json')
  };
}

function getPackageName(path: string): string {
  const posixPath = path.split('\\').join('/');
  const parts = posixPath.split('/');
  const index = parts.indexOf('packages');
  if (index === -1 || parts.length <= index + 1) {
    return '(root)';
  }
  const packageName = parts[index + 1] ?? '(root)';
  return packageName;
}

function classify(file: string): keyof ShapeCountsInterface | 'other' {
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

function buildShapeCounts(counts: ReadonlyMap<keyof ShapeCountsInterface, number>): ShapeCountsInterface {
  return {
    'legacy': counts.get('legacy') ?? 0,
    'loop': counts.get('loop') ?? 0,
    'scenarios': counts.get('scenarios') ?? 0
  };
}

function summarize(files: readonly string[]): SummaryInterface {
  const totalCounts = new Map<keyof ShapeCountsInterface, number>();
  const packageCounts = new Map<string, Map<keyof ShapeCountsInterface, number>>();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (file === undefined) {
      continue;
    }
    const shape = classify(file);
    if (shape === 'other') {
      continue;
    }
    totalCounts.set(shape, (totalCounts.get(shape) ?? 0) + 1);

    const packageName = getPackageName(file);
    const current = packageCounts.get(packageName) ?? new Map<keyof ShapeCountsInterface, number>();
    current.set(shape, (current.get(shape) ?? 0) + 1);
    packageCounts.set(packageName, current);
  }

  const packages: (readonly [string, ShapeCountsInterface])[] = [];
  for (const [packageName, counts] of packageCounts) {
    packages.push([packageName, buildShapeCounts(counts)]);
  }
  const sortedPackages = packages.toSorted(([a], [b]) => {
    const comparison = a.localeCompare(b);
    return comparison;
  });

  return { 'counts': buildShapeCounts(totalCounts), 'packages': sortedPackages };
}

const options = parseArgs(process.argv.slice(2));
const files = globSync('packages/*/tests/**/*.{test.ts,loop.spec.ts,scenarios.json}', { 'cwd': ROOT_DIR })
  .map((path) => {
    const posixPath = path.split('\\').join('/');
    return posixPath;
  })
  .toSorted();

const summary = summarize(files);

if (options.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`legacy test files: ${summary.counts.legacy}`);
  console.log(`loop suites: ${summary.counts.loop}`);
  console.log(`scenario fixtures: ${summary.counts.scenarios}`);

  const topLegacy = summary.packages
    .filter(([, stats]) => {
      const hasLegacy = stats.legacy > 0;
      return hasLegacy;
    })
    .toSorted(([, a], [, b]) => {
      const comparison = b.legacy - a.legacy;
      return comparison;
    })
    .slice(0, 12);

  if (topLegacy.length > 0) {
    console.log('packages with legacy test files:');
    for (let index = 0; index < topLegacy.length; index += 1) {
      const entry = topLegacy[index];
      if (entry === undefined) {
        continue;
      }
      const [packageName, stats] = entry;
      console.log(`- ${packageName}: ${stats.legacy} legacy, ${stats.loop} loop, ${stats.scenarios} scenario`);
    }
  }
}

if (options.check && summary.counts.legacy > 0) {
  console.error(`legacy test files remain: ${summary.counts.legacy}`);
  process.exitCode = 1;
}
