#!/usr/bin/env node
/**
 * check-no-circular-imports — fails when a circular import exists among
 * package sources. A cycle is a shared construct screaming to be created;
 * this check is the gate that stops a new one from landing.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(repoRoot, 'packages');

interface CircularDependencyReportInterface {
  readonly 'cycles': string[][];
}

function packageSourceDirs(): string[] {
  return readdirSync(packagesRoot, { 'withFileTypes': true })
    .filter((entry) => { return entry.isDirectory(); })
    .map((entry) => { return path.join(packagesRoot, entry.name, 'src'); })
    .filter((dir) => { return existsSync(dir); })
    .toSorted();
}

function madgeCircular(sourceDirs: string[]): CircularDependencyReportInterface {
  try {
    const output = execFileSync(
      'pnpm',
      ['exec', 'madge', '--circular', '--json', '--extensions', 'ts', ...sourceDirs],
      { 'cwd': repoRoot, 'encoding': 'utf8' }
    );
    return { 'cycles': JSON.parse(output) as string[][] };
  } catch (error) {
    const stdout = (error as { 'stdout'?: string }).stdout;
    if (typeof stdout === 'string' && stdout.trim().length > 0) {
      return { 'cycles': JSON.parse(stdout) as string[][] };
    }
    throw error;
  }
}

const sourceDirs = packageSourceDirs();
const { cycles } = madgeCircular(sourceDirs);

if (cycles.length > 0) {
  process.stderr.write(`check-no-circular-imports: ${String(cycles.length)} circular dependenc${cycles.length === 1 ? 'y' : 'ies'}.\n\n`);
  for (const cycle of cycles) {
    process.stderr.write(`  ${cycle.join(' > ')} > ${cycle[0]}\n`);
  }
  process.exit(1);
}

process.stdout.write(`check-no-circular-imports: OK (${String(sourceDirs.length)} package(s) checked).\n`);
