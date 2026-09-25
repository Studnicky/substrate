#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NODE_BIN = process.execPath;
const NODE_TEST_IMPORT = 'tsx';
const TEST_SUITE_LOGGING = process.env.TEST_SUITE_LOGGING === '1';
const DEFAULT_COVERAGE_INCLUDE_PATTERNS: readonly string[] = Object.freeze(['packages/*/src/**/*.ts']);
const COVERAGE_EXCLUDE_PATTERNS: readonly string[] = Object.freeze([
  'packages/*/dist/**',
  'packages/*/examples/**',
  'packages/*/src/browser/**',
  'packages/*/src/testing/**',
  'packages/*/src/**/*.d.ts',
  'packages/*/tests/**'
]);

const TIER_NAMES = ['integration', 'smoke', 'unit'] as const;
const MODE_NAMES = ['all', 'changed', 'integration', 'smoke', 'unit'] as const;

const TIER_PATTERNS: Readonly<Record<(typeof TIER_NAMES)[number], readonly string[]>> = Object.freeze({
  'integration': ['packages/*/tests/integration/**/*.loop.spec.ts'],
  'smoke': ['packages/*/tests/smoke/**/*.loop.spec.ts'],
  'unit': ['packages/*/tests/unit/**/*.loop.spec.ts']
});

interface CliOptionsInterface {
  readonly 'base': string;
  readonly 'coverage': boolean;
  readonly 'dryRun': boolean;
  readonly 'failIfEmpty': boolean;
  readonly 'mode': string;
  readonly 'packageFilter': string;
  readonly 'watch': boolean;
}

interface WorkspacePackageInterface {
  readonly 'dir': string;
  readonly 'name': string;
  readonly 'relativeDir': string;
}

interface AllModeSelectionsInterface {
  readonly 'integration': readonly string[];
  readonly 'smoke': readonly string[];
  readonly 'unit': readonly string[];
}

function shellQuote(value: unknown): string {
  const quoted = JSON.stringify(String(value));
  return quoted;
}

function logSuite(message: string): void {
  if (TEST_SUITE_LOGGING) {
    console.error(`[test-suite] ${message}`);
  }
}

function isTier(value: string): value is (typeof TIER_NAMES)[number] {
  const result = (TIER_NAMES as readonly string[]).includes(value);
  return result;
}

interface CliOptionsDraftInterface {
  'base': string;
  'coverage': boolean;
  'dryRun': boolean;
  'failIfEmpty': boolean;
  'mode': string;
  'packageFilter': string;
  'watch': boolean;
}

// Each key is a distinct CLI flag string; at most one matches a given arg.
const BOOLEAN_FLAG_SETTERS: Readonly<Record<string, (result: CliOptionsDraftInterface) => void>> = {
  '--coverage': (result) => { result.coverage = true; },
  '--dry-run': (result) => { result.dryRun = true; },
  '--fail-if-empty': (result) => { result.failIfEmpty = true; },
  '--watch': (result) => { result.watch = true; }
};

const VALUE_FLAG_SETTERS: Readonly<Record<string, (result: CliOptionsDraftInterface, value: string) => void>> = {
  '--base': (result, value) => { result.base = value; },
  '--package': (result, value) => { result.packageFilter = value; }
};

function validateParsedArgs(result: CliOptionsDraftInterface): void {
  if (result.mode === '') {
    result.mode = 'all';
  }

  if (!(MODE_NAMES as readonly string[]).includes(result.mode)) {
    throw new Error(`Unknown test suite mode: ${result.mode}`);
  }

  if (result.coverage && result.watch) {
    throw new Error('test-suite: --coverage cannot be combined with --watch');
  }
}

function parseArgs(argv: readonly string[]): CliOptionsInterface {
  const result: CliOptionsDraftInterface = {
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

    const booleanSetter = arg === undefined ? undefined : BOOLEAN_FLAG_SETTERS[arg];
    if (booleanSetter !== undefined) {
      booleanSetter(result);
      continue;
    }

    const valueSetter = arg === undefined ? undefined : VALUE_FLAG_SETTERS[arg];
    if (valueSetter !== undefined) {
      index += 1;
      valueSetter(result, argv[index] ?? '');
      continue;
    }

    if (result.mode === '') {
      result.mode = arg ?? '';
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  validateParsedArgs(result);
  return result;
}

function loadWorkspacePackages(): WorkspacePackageInterface[] {
  const entries = globSync('packages/*/package.json', { 'cwd': ROOT_DIR }).toSorted();

  const workspacePackages = entries.map((entry) => {
    const packageJsonPath = resolve(ROOT_DIR, entry);
    const packageDir = dirname(packageJsonPath);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { 'name'?: string };

    return {
      'dir': packageDir,
      'name': packageJson.name ?? basename(packageDir),
      'relativeDir': relative(ROOT_DIR, packageDir).split('\\').join('/')
    };
  });
  return workspacePackages;
}

function packageFilterCandidates(workspacePackage: WorkspacePackageInterface, packageFilter: string): boolean[] {
  const normalizedFilter = packageFilter.split('\\').join('/').replace(/\/+$/, '');
  const packageDirName = basename(workspacePackage.dir);
  const rootRelativeFilter = relative(ROOT_DIR, resolve(ROOT_DIR, packageFilter)).split('\\').join('/');
  const cwdRelativeFilter = relative(ROOT_DIR, resolve(process.cwd(), packageFilter)).split('\\').join('/');
  const absoluteFilter = resolve(process.cwd(), packageFilter);
  const rootAbsoluteFilter = resolve(ROOT_DIR, packageFilter);

  return [
    workspacePackage.name === packageFilter,
    workspacePackage.name === normalizedFilter,
    workspacePackage.relativeDir === normalizedFilter,
    workspacePackage.relativeDir === rootRelativeFilter,
    workspacePackage.relativeDir === cwdRelativeFilter,
    workspacePackage.dir === absoluteFilter,
    workspacePackage.dir === rootAbsoluteFilter,
    packageDirName === packageFilter,
    packageDirName === normalizedFilter
  ];
}

function packageMatchesFilter(workspacePackage: WorkspacePackageInterface, packageFilter: string): boolean {
  if (packageFilter === '') {
    return true;
  }
  if (packageFilter === '.') {
    const isCwd = workspacePackage.dir === process.cwd();
    return isCwd;
  }

  return packageFilterCandidates(workspacePackage, packageFilter).some((matches) => {return matches;});
}

function filterFilesByPackage(files: readonly string[], workspacePackages: readonly WorkspacePackageInterface[], packageFilter: string): string[] {
  if (packageFilter === '') {
    return [...files];
  }

  const matches = workspacePackages.filter((workspacePackage) => {
    const isMatch = packageMatchesFilter(workspacePackage, packageFilter);
    return isMatch;
  });

  if (matches.length === 0) {
    throw new Error(`Unknown package filter: ${packageFilter}`);
  }

  const matchDirs = new Set(matches.map((workspacePackage) => {
    const dir = workspacePackage.relativeDir;
    return dir;
  }));

  const filtered: string[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (file === undefined) {
      continue;
    }
    const posixFile = file.split('\\').join('/');
    const filePackageDir = posixFile.split('/').slice(0, 2).join('/');
    if (matchDirs.has(filePackageDir) || matchDirs.has(posixFile)) {
      filtered.push(file);
    }
  }
  return filtered;
}

function discoverTierFiles(tier: (typeof TIER_NAMES)[number]): string[] {
  const patterns = TIER_PATTERNS[tier];
  const files = new Set<string>();

  for (let patternIndex = 0; patternIndex < patterns.length; patternIndex += 1) {
    const pattern = patterns[patternIndex];
    if (pattern === undefined) {
      continue;
    }
    const matches = globSync(pattern, { 'cwd': ROOT_DIR });
    for (let matchIndex = 0; matchIndex < matches.length; matchIndex += 1) {
      const file = matches[matchIndex];
      if (file !== undefined) {
        files.add(file.split('\\').join('/'));
      }
    }
  }

  const sortedFiles = [...files].toSorted();
  return sortedFiles;
}

function discoverAllFiles(): string[] {
  const uniqueFiles = new Set<string>();
  const tierFileLists = [discoverTierFiles('unit'), discoverTierFiles('integration'), discoverTierFiles('smoke')];
  for (let listIndex = 0; listIndex < tierFileLists.length; listIndex += 1) {
    const tierFiles = tierFileLists[listIndex];
    if (tierFiles === undefined) {
      continue;
    }
    for (let fileIndex = 0; fileIndex < tierFiles.length; fileIndex += 1) {
      const file = tierFiles[fileIndex];
      if (file !== undefined) {
        uniqueFiles.add(file);
      }
    }
  }
  const sortedFiles = [...uniqueFiles].toSorted();
  return sortedFiles;
}

function runGitDiff(base: string): string[] {
  const proc = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`], {
    'cwd': ROOT_DIR,
    'encoding': 'utf8'
  });

  if (proc.status !== 0) {
    const stderrMessage = (proc.stderr ?? '').trim();
    throw new Error(stderrMessage !== '' ? stderrMessage : `git diff failed for ${base}...HEAD`);
  }

  const lines = (proc.stdout ?? '').trim().split('\n');
  const changedFiles: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined || line.length === 0) {
      continue;
    }
    changedFiles.push(line.split('\\').join('/'));
  }
  return changedFiles;
}

const UNIT_TEST_DIR_RE = /\/tests\/unit\//;
const INTEGRATION_TEST_DIR_RE = /\/tests\/integration\//;
const SMOKE_TEST_DIR_RE = /\/tests\/smoke\//;

function collectPackageTestFiles(packageRoot: string, selected: Set<string>): void {
  const allFiles = discoverAllFiles();
  for (let fileIndex = 0; fileIndex < allFiles.length; fileIndex += 1) {
    const testFile = allFiles[fileIndex];
    if (testFile?.split('\\').join('/').startsWith(`${packageRoot}/`) === true) {
      selected.add(testFile);
    }
  }
}

/** Returns true when the changed file lies outside packages/ (a root-level change). */
function processChangedFile(file: string, selected: Set<string>): boolean {
  if (!file.startsWith('packages/')) {
    return true;
  }

  const unitMatch = UNIT_TEST_DIR_RE.test(file);
  const integrationMatch = INTEGRATION_TEST_DIR_RE.test(file);
  const smokeMatch = SMOKE_TEST_DIR_RE.test(file);

  if (unitMatch || integrationMatch || smokeMatch) {
    selected.add(file);
    return false;
  }

  const packageRoot = file.split('/').slice(0, 2).join('/');
  collectPackageTestFiles(packageRoot, selected);
  return false;
}

function selectChangedFiles(base: string, workspacePackages: readonly WorkspacePackageInterface[], packageFilter: string): string[] {
  const changed = runGitDiff(base);

  if (changed.length === 0) {
    return [];
  }

  const selected = new Set<string>();
  let changedRoot = false;

  for (let index = 0; index < changed.length; index += 1) {
    const file = changed[index];
    if (file === undefined) {
      continue;
    }
    if (processChangedFile(file, selected)) {
      changedRoot = true;
    }
  }

  if (changedRoot) {
    const rootFiltered = filterFilesByPackage(discoverAllFiles(), workspacePackages, packageFilter);
    return rootFiltered;
  }

  const selectedFiltered = filterFilesByPackage([...selected].toSorted(), workspacePackages, packageFilter);
  return selectedFiltered;
}

function resolveModeFiles(mode: string, workspacePackages: readonly WorkspacePackageInterface[], packageFilter: string, base: string): { readonly 'files': string[]; readonly 'kind': 'files' } | { readonly 'kind': 'tiers'; readonly 'tiers': AllModeSelectionsInterface } {
  if (isTier(mode)) {
    return { 'files': filterFilesByPackage(discoverTierFiles(mode), workspacePackages, packageFilter), 'kind': 'files' };
  }

  if (mode === 'all') {
    return {
      'kind': 'tiers',
      'tiers': {
        'integration': filterFilesByPackage(discoverTierFiles('integration'), workspacePackages, packageFilter),
        'smoke': filterFilesByPackage(discoverTierFiles('smoke'), workspacePackages, packageFilter),
        'unit': filterFilesByPackage(discoverTierFiles('unit'), workspacePackages, packageFilter)
      }
    };
  }

  const resolvedBase = base !== '' ? base : 'origin/develop';
  return { 'files': filterFilesByPackage(selectChangedFiles(resolvedBase, workspacePackages, packageFilter), workspacePackages, packageFilter), 'kind': 'files' };
}

const PACKAGE_ROOT_RE = /^(packages\/[^/]+)\//;

function resolveCoverageIncludePatterns(files: readonly string[]): readonly string[] {
  const packageRoots = new Set<string>();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (file === undefined) {
      continue;
    }
    const match = PACKAGE_ROOT_RE.exec(file.split('\\').join('/'));
    if (match?.[1] !== undefined) {
      packageRoots.add(match[1]);
    }
  }

  if (packageRoots.size === 0) {
    return DEFAULT_COVERAGE_INCLUDE_PATTERNS;
  }

  const patterns = [...packageRoots].toSorted().map((packageRoot) => {
    const pattern = `${packageRoot}/src/**/*.ts`;
    return pattern;
  });
  return patterns;
}

function appendCoverageArgs(args: string[], files: readonly string[]): void {
  args.push('--experimental-test-coverage');

  const includePatterns = resolveCoverageIncludePatterns(files);
  for (let index = 0; index < includePatterns.length; index += 1) {
    const pattern = includePatterns[index];
    if (pattern !== undefined) {
      args.push(`--test-coverage-include=${pattern}`);
    }
  }

  for (let index = 0; index < COVERAGE_EXCLUDE_PATTERNS.length; index += 1) {
    const pattern = COVERAGE_EXCLUDE_PATTERNS[index];
    if (pattern !== undefined) {
      args.push(`--test-coverage-exclude=${pattern}`);
    }
  }
}

function renderCommand(files: readonly string[], watch: boolean, coverage: boolean): string {
  const args: string[] = [NODE_BIN];

  if (coverage) {
    appendCoverageArgs(args, files);
  }

  args.push('--import', NODE_TEST_IMPORT, '--test');

  if (watch) {
    args.push('--watch');
  }

  args.push(...files.map((file) => { return file; }));
  const command = args.map(shellQuote).join(' ');
  return command;
}

async function runNodeTests(files: readonly string[], watch: boolean, coverage: boolean): Promise<void> {
  const args: string[] = [];

  if (coverage) {
    appendCoverageArgs(args, files);
  }

  args.push('--import', NODE_TEST_IMPORT, '--test');

  if (watch) {
    args.push('--watch');
  }

  args.push(...files);
  logSuite(`spawn ${NODE_BIN} ${args.map(shellQuote).join(' ')} (${files.length} files)`);

  await new Promise<void>((settle, fail) => {
    const child = spawn(NODE_BIN, args, {
      'cwd': ROOT_DIR,
      'env': process.env,
      'stdio': 'inherit'
    });

    child.on('error', fail);
    child.on('exit', (code, signal) => {
      if (signal !== null) {
        logSuite(`exit signal=${signal}`);
        fail(new Error(`node exited with signal ${signal}`));
        return;
      }
      if (code !== 0) {
        logSuite(`exit code=${code}`);
        fail(new Error(`node exited with code ${code}`));
        return;
      }
      logSuite('exit code=0');
      settle();
    });
  });
}

async function runTiersMode(mode: string, selection: { readonly 'kind': 'tiers'; readonly 'tiers': AllModeSelectionsInterface }, options: CliOptionsInterface): Promise<void> {
  const allSelections = selection.tiers;
  const tiers: readonly (readonly [(typeof TIER_NAMES)[number], readonly string[]])[] = [
    ['unit', allSelections.unit],
    ['integration', allSelections.integration],
    ['smoke', allSelections.smoke]
  ];
  const runnableTiers = tiers.filter(([, files]) => {
    const hasFiles = files.length > 0;
    return hasFiles;
  });
  logSuite(`mode=all unit=${allSelections.unit.length} integration=${allSelections.integration.length} smoke=${allSelections.smoke.length}`);

  if (runnableTiers.length === 0) {
    const message = `test-suite: no ${mode} test files found${options.packageFilter !== '' ? ` for ${options.packageFilter}` : ''}`;
    if (options.failIfEmpty) {
      throw new Error(message);
    }
    console.log(message);
    return;
  }

  if (options.dryRun) {
    for (let index = 0; index < runnableTiers.length; index += 1) {
      const entry = runnableTiers[index];
      if (entry === undefined) {
        continue;
      }
      const [tier, files] = entry;
      console.log(`${tier}: ${renderCommand(files, options.watch, options.coverage)}`);
    }
    return;
  }

  for (let index = 0; index < runnableTiers.length; index += 1) {
    const entry = runnableTiers[index];
    if (entry === undefined) {
      continue;
    }
    const [, files] = entry;
    await runNodeTests(files, options.watch, options.coverage);
  }
}

async function runMode(mode: string, options: CliOptionsInterface, workspacePackages: readonly WorkspacePackageInterface[]): Promise<void> {
  const selection = resolveModeFiles(mode, workspacePackages, options.packageFilter, options.base);

  if (selection.kind === 'tiers') {
    await runTiersMode(mode, selection, options);
    return;
  }

  const { files } = selection;
  logSuite(`mode=${mode} files=${files.length}${options.packageFilter !== '' ? ` package=${options.packageFilter}` : ''}${options.base !== '' ? ` base=${options.base}` : ''}`);

  if (files.length === 0) {
    const message = `test-suite: no ${mode} test files found${options.packageFilter !== '' ? ` for ${options.packageFilter}` : ''}`;
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

class OrphanedSpecCheck {
  /** A spec file no tier pattern matches never runs; the runner refuses to start rather than report a silent pass. */
  public static assertNone(): void {
    const tiered = new Set(discoverAllFiles());
    const present = globSync('packages/*/tests/**/*.spec.ts', { 'cwd': ROOT_DIR }).map((file) => {
      return file.split('\\').join('/');
    });
    const orphans = present.filter((file) => {
      return tiered.has(file) === false;
    });
    if (orphans.length > 0) {
      throw new Error(`spec files matched by no tier pattern, so they never run: ${orphans.toSorted().join(', ')}`);
    }
  }
}

interface ExampleScenarioCaseInputInterface {
  readonly 'entrypoint'?: string;
  readonly 'examplesRoot'?: string;
  readonly 'file'?: string;
  readonly 'fileName'?: string;
}

interface ExampleScenarioFileInterface {
  readonly 'cases': readonly { readonly 'input': ExampleScenarioCaseInputInterface }[];
}

/** A scenario case declares one file (`file`/`entrypoint`/`fileName`) or every `.ts` file directly under a directory (`examplesRoot`). */
function resolveSingleFileCandidates(scenarioDir: string, singleFile: string): readonly string[] {
  const relativeToSpec = resolve(ROOT_DIR, scenarioDir, singleFile);
  const relativeToExamplesRoot = resolve(ROOT_DIR, scenarioDir, '../../examples', singleFile);
  return [relativeToSpec, relativeToExamplesRoot]
    .filter((candidate) => {
      return existsSync(candidate);
    })
    .map((candidate) => {
      return relative(ROOT_DIR, candidate).split('\\').join('/');
    });
}

function resolveDeclaredExampleFiles(scenarioDir: string, input: ExampleScenarioCaseInputInterface): readonly string[] {
  const singleFile = input.file ?? input.entrypoint ?? input.fileName;
  if (singleFile !== undefined) {
    const candidates = resolveSingleFileCandidates(scenarioDir, singleFile);
    if (candidates.length > 0) {
      return candidates;
    }
    return [relative(ROOT_DIR, resolve(ROOT_DIR, scenarioDir, singleFile)).split('\\').join('/')];
  }
  if (input.examplesRoot !== undefined) {
    const examplesDir = resolve(ROOT_DIR, scenarioDir, input.examplesRoot);
    return globSync('*.ts', { 'cwd': examplesDir }).map((file) => {
      return relative(ROOT_DIR, resolve(examplesDir, file)).split('\\').join('/');
    });
  }
  return [];
}

class ExampleOrphanCheck {
  /** An example file on disk with no smoke scenario entry, or a scenario entry naming a file that does not exist, hides silently otherwise — this is how 63 examples across 32 packages stayed unrun. */
  public static assertNone(): void {
    const exampleFiles = new Set(globSync('packages/*/examples/*.ts', { 'cwd': ROOT_DIR }).map((file) => {
      return file.split('\\').join('/');
    }));
    const scenarioFiles = globSync('packages/*/tests/smoke/examples.scenarios.json', { 'cwd': ROOT_DIR });
    const declared = new Set<string>();
    const missing: string[] = [];
    for (const scenarioFile of scenarioFiles) {
      const scenarioDir = dirname(scenarioFile);
      const scenarioJson = JSON.parse(readFileSync(resolve(ROOT_DIR, scenarioFile), 'utf8')) as ExampleScenarioFileInterface;
      for (const scenarioCase of scenarioJson.cases) {
        for (const resolved of resolveDeclaredExampleFiles(scenarioDir, scenarioCase.input)) {
          declared.add(resolved);
          if (exampleFiles.has(resolved) === false) {
            missing.push(`${scenarioFile} -> ${resolved}`);
          }
        }
      }
    }
    const unclassified = [...exampleFiles].filter((file) => {
      return declared.has(file) === false;
    });
    const problems: string[] = [];
    if (unclassified.length > 0) {
      problems.push(`example files with no smoke scenario entry: ${unclassified.toSorted().join(', ')}`);
    }
    if (missing.length > 0) {
      problems.push(`smoke scenario entries naming a file that does not exist: ${missing.toSorted().join(', ')}`);
    }
    if (problems.length > 0) {
      throw new Error(problems.join('; '));
    }
  }
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  OrphanedSpecCheck.assertNone();
  ExampleOrphanCheck.assertNone();
  const workspacePackages = loadWorkspacePackages();

  await runMode(options.mode, options, workspacePackages);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
