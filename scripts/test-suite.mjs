#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, globSync } from 'node:fs';
import { dirname, basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NODE_BIN = process.execPath;
const NODE_TEST_IMPORT = 'tsx';
const TEST_SUITE_LOGGING = process.env.TEST_SUITE_LOGGING === '1';
const DEFAULT_COVERAGE_INCLUDE_PATTERNS = Object.freeze(['packages/*/src/**/*.ts']);
const COVERAGE_EXCLUDE_PATTERNS = Object.freeze([
  'packages/*/dist/**',
  'packages/*/examples/**',
  'packages/*/src/browser/**',
  'packages/*/src/testing/**',
  'packages/*/src/**/*.d.ts',
  'packages/*/tests/**'
]);
const TIER_PATTERNS = Object.freeze({
  'integration': ['packages/*/tests/integration/**/*.loop.spec.ts'],
  'smoke': ['packages/*/tests/smoke/**/*.loop.spec.ts'],
  'unit': ['packages/*/tests/unit/**/*.loop.spec.ts']
});

function toPosixPath(path) {
  return path.split('\\').join('/');
}

function shellQuote(value) {
  return JSON.stringify(String(value));
}

function logSuite(message) {
  if (TEST_SUITE_LOGGING) {
    console.error(`[test-suite] ${message}`);
  }
}

function parseArgs(argv) {
  const result = {
    'base': '',
    'coverage': false,
    'dryRun': false,
    'failIfEmpty': false,
    'mode': '',
    'packageFilter': '',
    'watch': false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }
    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }
    if (arg === '--coverage') {
      result.coverage = true;
      continue;
    }
    if (arg === '--fail-if-empty') {
      result.failIfEmpty = true;
      continue;
    }
    if (arg === '--watch') {
      result.watch = true;
      continue;
    }
    if (arg === '--base') {
      index += 1;
      result.base = argv[index] ?? '';
      continue;
    }
    if (arg === '--package') {
      index += 1;
      result.packageFilter = argv[index] ?? '';
      continue;
    }

    if (result.mode === '') {
      result.mode = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (result.mode === '') {
    result.mode = 'all';
  }

  if (!new Set(['all', 'changed', 'integration', 'smoke', 'unit']).has(result.mode)) {
    throw new Error(`Unknown test suite mode: ${result.mode}`);
  }

  if (result.coverage && result.watch) {
    throw new Error('test-suite: --coverage cannot be combined with --watch');
  }

  return result;
}

function loadWorkspacePackages() {
  const entries = globSync('packages/*/package.json', { 'cwd': ROOT_DIR }).toSorted();

  return entries.map((entry) => {
    const packageJsonPath = resolve(ROOT_DIR, entry);
    const packageDir = dirname(packageJsonPath);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    return {
      'dir': packageDir,
      'name': packageJson.name ?? basename(packageDir),
      'relativeDir': toPosixPath(relative(ROOT_DIR, packageDir))
    };
  });
}

function packageMatchesFilter(workspacePackage, packageFilter) {
  if (packageFilter === '') {
    return true;
  }
  if (packageFilter === '.') {
    return workspacePackage.dir === process.cwd();
  }

  const normalizedFilter = toPosixPath(packageFilter).replace(/\/+$/, '');
  const packageDirName = basename(workspacePackage.dir);
  const rootRelativeFilter = toPosixPath(relative(ROOT_DIR, resolve(ROOT_DIR, packageFilter)));
  const cwdRelativeFilter = toPosixPath(relative(ROOT_DIR, resolve(process.cwd(), packageFilter)));
  const absoluteFilter = resolve(process.cwd(), packageFilter);
  const rootAbsoluteFilter = resolve(ROOT_DIR, packageFilter);

  return (
    workspacePackage.name === packageFilter ||
    workspacePackage.name === normalizedFilter ||
    workspacePackage.relativeDir === normalizedFilter ||
    workspacePackage.relativeDir === rootRelativeFilter ||
    workspacePackage.relativeDir === cwdRelativeFilter ||
    workspacePackage.dir === absoluteFilter ||
    workspacePackage.dir === rootAbsoluteFilter ||
    packageDirName === packageFilter ||
    packageDirName === normalizedFilter
  );
}

function filterFilesByPackage(files, workspacePackages, packageFilter) {
  if (packageFilter === '') {
    return files;
  }

  const matches = workspacePackages.filter((workspacePackage) => packageMatchesFilter(workspacePackage, packageFilter));

  if (matches.length === 0) {
    throw new Error(`Unknown package filter: ${packageFilter}`);
  }

  return files.filter((file) => {
    const posixFile = toPosixPath(file);

    return matches.some((workspacePackage) => {
      const prefix = `${workspacePackage.relativeDir}/`;
      return posixFile === workspacePackage.relativeDir || posixFile.startsWith(prefix);
    });
  });
}

function discoverTierFiles(tier) {
  const patterns = TIER_PATTERNS[tier];
  const files = new Set();

  for (const pattern of patterns) {
    for (const file of globSync(pattern, { 'cwd': ROOT_DIR })) {
      files.add(toPosixPath(file));
    }
  }

  return [...files].toSorted();
}

function discoverAllFiles() {
  return [...new Set([
    ...discoverTierFiles('unit'),
    ...discoverTierFiles('integration'),
    ...discoverTierFiles('smoke')
  ])].toSorted();
}

function runGitDiff(base) {
  const proc = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`], {
    'cwd': ROOT_DIR,
    'encoding': 'utf8'
  });

  if (proc.status !== 0) {
    throw new Error((proc.stderr || '').trim() || `git diff failed for ${base}...HEAD`);
  }

  return (proc.stdout || '')
    .trim()
    .split('\n')
    .filter((line) => line.length > 0)
    .map(toPosixPath);
}

function selectChangedFiles(base, workspacePackages, packageFilter) {
  const changed = runGitDiff(base);

  if (changed.length === 0) {
    return [];
  }

  const selected = new Set();
  let changedRoot = false;

  for (const file of changed) {
    if (!file.startsWith('packages/')) {
      changedRoot = true;
      continue;
    }

    const unitMatch = /\/tests\/unit\//.test(file);
    const integrationMatch = /\/tests\/integration\//.test(file);
    const smokeMatch = /\/tests\/smoke\//.test(file);

    if (unitMatch || integrationMatch || smokeMatch) {
      selected.add(file);
      continue;
    }

    const packageRoot = file.split('/').slice(0, 2).join('/');
    for (const testFile of discoverAllFiles()) {
      if (toPosixPath(testFile).startsWith(`${packageRoot}/`)) {
        selected.add(testFile);
      }
    }
  }

  if (changedRoot) {
    return filterFilesByPackage(discoverAllFiles(), workspacePackages, packageFilter);
  }

  return filterFilesByPackage([...selected].toSorted(), workspacePackages, packageFilter);
}

function resolveModeFiles(mode, workspacePackages, packageFilter, base) {
  if (mode === 'unit' || mode === 'integration' || mode === 'smoke') {
    return filterFilesByPackage(discoverTierFiles(mode), workspacePackages, packageFilter);
  }

  if (mode === 'all') {
    return {
      'integration': filterFilesByPackage(discoverTierFiles('integration'), workspacePackages, packageFilter),
      'smoke': filterFilesByPackage(discoverTierFiles('smoke'), workspacePackages, packageFilter),
      'unit': filterFilesByPackage(discoverTierFiles('unit'), workspacePackages, packageFilter)
    };
  }

  return filterFilesByPackage(selectChangedFiles(base || 'origin/develop', workspacePackages, packageFilter), workspacePackages, packageFilter);
}

function resolveCoverageIncludePatterns(files) {
  const packageRoots = new Set();

  for (const file of files) {
    const match = /^(packages\/[^/]+)\//.exec(toPosixPath(file));
    if (match?.[1] !== undefined) {
      packageRoots.add(match[1]);
    }
  }

  if (packageRoots.size === 0) {
    return DEFAULT_COVERAGE_INCLUDE_PATTERNS;
  }

  return [...packageRoots].toSorted().map((packageRoot) => `${packageRoot}/src/**/*.ts`);
}

function appendCoverageArgs(args, files) {
  args.push('--experimental-test-coverage');

  for (const pattern of resolveCoverageIncludePatterns(files)) {
    args.push(`--test-coverage-include=${pattern}`);
  }

  for (const pattern of COVERAGE_EXCLUDE_PATTERNS) {
    args.push(`--test-coverage-exclude=${pattern}`);
  }
}

function renderCommand(files, watch, coverage) {
  const args = [NODE_BIN];

  if (coverage) {
    appendCoverageArgs(args, files);
  }

  args.push('--import', NODE_TEST_IMPORT, '--test');

  if (watch) {
    args.push('--watch');
  }

  args.push(...files.map((file) => file));
  return args.map(shellQuote).join(' ');
}

async function runNodeTests(files, watch, coverage) {
  const args = [];

  if (coverage) {
    appendCoverageArgs(args, files);
  }

  args.push('--import', NODE_TEST_IMPORT, '--test');

  if (watch) {
    args.push('--watch');
  }

  args.push(...files);
  logSuite(`spawn ${NODE_BIN} ${args.map(shellQuote).join(' ')} (${files.length} files)`);

  await new Promise((resolve, reject) => {
    const child = spawn(NODE_BIN, args, {
      'cwd': ROOT_DIR,
      'env': process.env,
      'stdio': 'inherit'
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal !== null) {
        logSuite(`exit signal=${signal}`);
        reject(new Error(`node exited with signal ${signal}`));
        return;
      }
      if (code !== 0) {
        logSuite(`exit code=${code}`);
        reject(new Error(`node exited with code ${code}`));
        return;
      }
      logSuite('exit code=0');
      resolve();
    });
  });
}

async function runMode(mode, options, workspacePackages) {
  const selections = resolveModeFiles(mode, workspacePackages, options.packageFilter, options.base);

  if (mode === 'all') {
    const tiers = [
      ['unit', selections.unit],
      ['integration', selections.integration],
      ['smoke', selections.smoke]
    ];
    const runnableTiers = tiers.filter(([, files]) => files.length > 0);
    logSuite(`mode=all unit=${selections.unit.length} integration=${selections.integration.length} smoke=${selections.smoke.length}`);

    if (runnableTiers.length === 0) {
      const message = `test-suite: no ${mode} test files found${options.packageFilter ? ` for ${options.packageFilter}` : ''}`;
      if (options.failIfEmpty) {
        throw new Error(message);
      }
      console.log(message);
      return;
    }

    if (options.dryRun) {
      for (const [tier, files] of runnableTiers) {
        console.log(`${tier}: ${renderCommand(files, options.watch, options.coverage)}`);
      }
      return;
    }

    for (const [, files] of runnableTiers) {
      await runNodeTests(files, options.watch, options.coverage);
    }
    return;
  }

  const files = selections;
  logSuite(`mode=${mode} files=${files.length}${options.packageFilter ? ` package=${options.packageFilter}` : ''}${options.base ? ` base=${options.base}` : ''}`);

  if (files.length === 0) {
    const message = `test-suite: no ${mode} test files found${options.packageFilter ? ` for ${options.packageFilter}` : ''}`;
    if (options.failIfEmpty) {
      throw new Error(message);
    }
    console.log(message);
    return;
  }

  if (options.dryRun) {
    console.log(`${mode}: ${renderCommand(files, options.watch, options.coverage)}`);
    return;
  }

  await runNodeTests(files, options.watch, options.coverage);
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const workspacePackages = loadWorkspacePackages();

  await runMode(options.mode, options, workspacePackages);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
