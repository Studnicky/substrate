import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import ts from 'typescript';

interface BrowserEntrypointInterface {
  readonly 'entrypoint': string;
  readonly 'packageName': string;
}

interface ImportSpecifierEntryInterface {
  readonly 'node': ts.StringLiteralLike;
  readonly 'specifier': string;
}

interface ExecutableTargetInterface {
  readonly 'importTarget': string;
  readonly 'typesTarget': string;
}

interface ManifestEntryInterface {
  readonly 'exportsMap': Record<string, unknown>;
  readonly 'packageDirectory': string;
}

interface WorkspaceSpecifierInterface {
  readonly 'packageName': string;
  readonly 'subpath': string;
}

interface ResolvedWorkspaceTargetInterface {
  readonly 'exportKey': string;
  readonly 'sourcePath': string;
}

const checkerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const executeFile = promisify(execFile);
const rootOptionIndex = process.argv.indexOf('--root');
const repositoryRoot = rootOptionIndex === -1
  ? process.cwd()
  : resolve(process.argv[rootOptionIndex + 1] ?? process.cwd());
const packageRoot = join(repositoryRoot, 'packages');
const validateOnly = process.argv.includes('--validate-only');
const packageDirectories = (await readdir(packageRoot, { 'withFileTypes': true }))
  .filter((directory) => {return directory.isDirectory();})
  .map((directory) => {return directory.name;})
  .toSorted();
const errors: string[] = [];
const browserEntrypoints: BrowserEntrypointInterface[] = [];
const packageManifests = new Map<string, ManifestEntryInterface>();
const visitedBrowserFiles = new Set<string>();
// Ajv compiles validator functions via `new Function()` at runtime.
const dynamicCodeConstructionPackages = new Set(['ajv']);

function executableTarget(exportEntry: unknown, packageName: string, subpath: string): ExecutableTargetInterface | undefined {
  if (typeof exportEntry !== 'object' || exportEntry === null || Array.isArray(exportEntry)) {
    errors.push(`${packageName} ${subpath} must declare import and types targets`);
    return undefined;
  }

  const importTarget = (exportEntry as Record<string, unknown>).import;
  const typesTarget = (exportEntry as Record<string, unknown>).types;

  if (typeof importTarget !== 'string' || typeof typesTarget !== 'string') {
    errors.push(`${packageName} ${subpath} must declare string import and types targets`);
    return undefined;
  }

  return { 'importTarget': importTarget, 'typesTarget': typesTarget };
}

function sourceEntrypoint(packageDirectory: string, packageName: string, target: string): string | undefined {
  if (!target.startsWith('./dist/') || !target.endsWith('.js')) {
    errors.push(`${packageName} browser import target ${target} must map from ./dist/*.js to source`);
    return undefined;
  }

  return join(packageDirectory, 'src', `${target.slice('./dist/'.length, -'.js'.length)}.ts`);
}

const neutralFeatureNames = ['interfaces', 'entities', 'types'];

async function hasSourceFeatureEntrypoint(packageDirectory: string, featureName: string): Promise<boolean> {
  try {
    return (await stat(join(packageDirectory, 'src', featureName, 'index.ts'))).isFile();
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(directory, { 'withFileTypes': true });

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectTypeScriptFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(path);
    }
  }

  return files;
}

function reportBarePackageSpecifier(sourceFile: ts.SourceFile, node: ts.Node, specifier: string): void {
  if (!/^@studnicky\/[^/]+$/u.test(specifier)) {
    return;
  }

  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  errors.push(`${relative(repositoryRoot, sourceFile.fileName)}:${String(position.line + 1)}:${String(position.character + 1)} imports ${specifier} without /node or /browser`);
}

function extractImportExportSpecifier(node: ts.Node): ImportSpecifierEntryInterface | undefined {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
    return { 'node': node.moduleSpecifier, 'specifier': node.moduleSpecifier.text };
  }
  return undefined;
}

function extractImportEqualsSpecifier(node: ts.Node): ImportSpecifierEntryInterface | undefined {
  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression !== undefined && ts.isStringLiteral(node.moduleReference.expression)) {
    return { 'node': node.moduleReference.expression, 'specifier': node.moduleReference.expression.text };
  }
  return undefined;
}

function extractImportTypeSpecifier(node: ts.Node): ImportSpecifierEntryInterface | undefined {
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
    return { 'node': node.argument.literal, 'specifier': node.argument.literal.text };
  }
  return undefined;
}

function extractDynamicImportSpecifier(node: ts.Node): ImportSpecifierEntryInterface | undefined {
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1) {
    const [firstArgument] = node.arguments;
    if (firstArgument !== undefined && ts.isStringLiteral(firstArgument)) {
      return { 'node': firstArgument, 'specifier': firstArgument.text };
    }
  }
  return undefined;
}

// Each extractor guards a disjoint ts.Node shape; at most one matches per node.
const specifierExtractors: readonly ((node: ts.Node) => ImportSpecifierEntryInterface | undefined)[] = [
  extractImportExportSpecifier,
  extractImportEqualsSpecifier,
  extractImportTypeSpecifier,
  extractDynamicImportSpecifier
];

function collectImportSpecifiers(sourceFile: ts.SourceFile): ImportSpecifierEntryInterface[] {
  const specifiers: ImportSpecifierEntryInterface[] = [];

  const visit = (node: ts.Node): void => {
    for (const extractor of specifierExtractors) {
      const found = extractor(node);
      if (found !== undefined) {
        specifiers.push(found);
        break;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return specifiers;
}

function inspectEmittedModuleSpecifiers(sourceFile: ts.SourceFile, packageName: string): void {
  for (const { specifier } of collectImportSpecifiers(sourceFile)) {
    if (specifier.startsWith('node:')) {
      throw new Error(`${packageName} browser entrypoint includes Node builtin ${specifier}`);
    }
  }
}

async function inspectBrowserBuildOutput(outputDirectory: string, packageName: string): Promise<void> {
  const outputFiles = await readdir(outputDirectory);

  for (const outputFile of outputFiles) {
    if (!outputFile.endsWith('.js')) {
      continue;
    }

    const outputPath = join(outputDirectory, outputFile);
    const code = await readFile(outputPath, 'utf8');
    inspectEmittedModuleSpecifiers(
      ts.createSourceFile(outputPath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS),
      packageName
    );
  }
}

function inspectStaticSpecifiers(sourceFile: ts.SourceFile): void {
  for (const { node, specifier } of collectImportSpecifiers(sourceFile)) {
    reportBarePackageSpecifier(sourceFile, node, specifier);
  }
}

function describeChain(chain: string[]): string {
  return chain.map((filePath) => {return relative(repositoryRoot, filePath);}).join(' -> ');
}

function parseWorkspaceSpecifier(specifier: string): WorkspaceSpecifierInterface | undefined {
  const match = /^(@studnicky\/[^/]+)(\/.*)?$/u.exec(specifier);
  if (match === null) {
    return undefined;
  }

  return { 'packageName': match[1] ?? '', 'subpath': match[2] ?? '' };
}

function resolveWorkspaceTarget(packageName: string, subpath: string): ResolvedWorkspaceTargetInterface | undefined {
  const manifestEntry = packageManifests.get(packageName);
  if (manifestEntry === undefined) {
    return undefined;
  }

  const exportKey = `.${subpath}`;
  const exportEntry = manifestEntry.exportsMap[exportKey];
  if (typeof exportEntry !== 'object' || exportEntry === null || Array.isArray(exportEntry)) {
    return undefined;
  }

  const importTarget = (exportEntry as Record<string, unknown>).import;
  if (typeof importTarget !== 'string' || !importTarget.startsWith('./dist/') || !importTarget.endsWith('.js')) {
    return undefined;
  }

  const sourcePath = join(manifestEntry.packageDirectory, 'src', `${importTarget.slice('./dist/'.length, -'.js'.length)}.ts`);
  return { 'exportKey': exportKey, 'sourcePath': sourcePath };
}

function isNodeRuntimeExport(exportKey: string): boolean {
  return exportKey === './node' || exportKey.startsWith('./node/');
}

function resolveRelativeImport(fromFile: string, specifier: string): string {
  const target = resolve(dirname(fromFile), specifier);
  if (target.endsWith('.ts')) {
    return target;
  }

  return target.endsWith('.js') ? `${target.slice(0, -'.js'.length)}.ts` : `${target}.ts`;
}

function thirdPartyPackageName(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? `${segments[0]}/${segments[1]}` : (segments[0] ?? specifier);
}

async function inspectReachableSpecifier(specifier: string, node: ts.Node, sourceFile: ts.SourceFile, packageName: string, chain: string[]): Promise<void> {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const location = `${relative(repositoryRoot, sourceFile.fileName)}:${String(position.line + 1)}:${String(position.character + 1)}`;

  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    await inspectBrowserReachableFile(resolveRelativeImport(sourceFile.fileName, specifier), packageName, chain);
    return;
  }

  const workspaceSpecifier = parseWorkspaceSpecifier(specifier);
  if (workspaceSpecifier !== undefined) {
    if (workspaceSpecifier.subpath === '') {
      return;
    }

    const resolved = resolveWorkspaceTarget(workspaceSpecifier.packageName, workspaceSpecifier.subpath);
    if (resolved === undefined) {
      return;
    }

    if (isNodeRuntimeExport(resolved.exportKey)) {
      errors.push(`${packageName} browser graph imports ${specifier} (a Node-only export) at ${location} via ${describeChain(chain)}`);
      return;
    }

    await inspectBrowserReachableFile(resolved.sourcePath, packageName, chain);
    return;
  }

  if (specifier.startsWith('node:')) {
    return;
  }

  if (dynamicCodeConstructionPackages.has(thirdPartyPackageName(specifier))) {
    errors.push(`${packageName} browser graph imports ${specifier} (constructs code at runtime) at ${location} via ${describeChain(chain)}`);
  }
}

async function inspectBrowserReachableFile(filePath: string, packageName: string, chain: string[]): Promise<void> {
  if (visitedBrowserFiles.has(filePath)) {
    return;
  }

  visitedBrowserFiles.add(filePath);

  let sourceText: string;
  try {
    sourceText = await readFile(filePath, 'utf8');
  } catch {
    return;
  }

  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const nextChain = [...chain, filePath];

  for (const { node, specifier } of collectImportSpecifiers(sourceFile)) {
    await inspectReachableSpecifier(specifier, node, sourceFile, packageName, nextChain);
  }
}

async function walkBrowserGraph(): Promise<void> {
  for (const { entrypoint, packageName } of browserEntrypoints) {
    await inspectBrowserReachableFile(entrypoint, packageName, []);
  }
}

for (const directoryName of packageDirectories) {
  const packageDirectory = join(packageRoot, directoryName);
  const manifestPath = join(packageDirectory, 'package.json');
  let manifest: Record<string, unknown>;

  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
  } catch {
    continue;
  }

  const packageName = typeof manifest.name === 'string' ? manifest.name : `packages/${directoryName}`;

  for (const legacyField of ['main', 'module', 'types']) {
    if (legacyField in manifest) {
      errors.push(`${packageName} must not declare ${legacyField}; use ./node and ./browser exports`);
    }
  }

  const exportsMap = manifest.exports;
  if (typeof exportsMap !== 'object' || exportsMap === null || Array.isArray(exportsMap)) {
    errors.push(`${packageName} must declare an exports map with ./node`);
    continue;
  }

  const typedExportsMap = exportsMap as Record<string, unknown>;
  packageManifests.set(packageName, { 'exportsMap': typedExportsMap, 'packageDirectory': packageDirectory });

  if (Object.hasOwn(typedExportsMap, '.')) {
    errors.push(`${packageName} must not declare a root export; use ./node or ./browser`);
  }

  const runtimeFeatureNames = new Set<string>();
  for (const subpath of Object.keys(typedExportsMap)) {
    const runtimeFeatureMatch = /^\.\/(node|browser)\/(.+)$/u.exec(subpath);
    if (runtimeFeatureMatch === null) {
      continue;
    }

    const runtime = runtimeFeatureMatch[1];
    const featureName = runtimeFeatureMatch[2];
    if (runtime === undefined || featureName === undefined) {
      continue;
    }

    if (neutralFeatureNames.includes(featureName)) {
      errors.push(`${packageName} ${subpath} must use the package-level ./${featureName} export`);
      continue;
    }

    const counterpartRuntime = runtime === 'node' ? 'browser' : 'node';
    const counterpartSubpath = `./${counterpartRuntime}/${featureName}`;
    if (!Object.hasOwn(typedExportsMap, counterpartSubpath)) {
      errors.push(`${packageName} ${subpath} requires matching ${counterpartSubpath} runtime feature export`);
      continue;
    }

    runtimeFeatureNames.add(featureName);
  }

  for (const featureName of runtimeFeatureNames) {
    const nodeFeatureSubpath = `./node/${featureName}`;
    const browserFeatureSubpath = `./browser/${featureName}`;
    const nodeFeatureTarget = executableTarget(typedExportsMap[nodeFeatureSubpath], packageName, nodeFeatureSubpath);
    const browserFeatureTarget = executableTarget(typedExportsMap[browserFeatureSubpath], packageName, browserFeatureSubpath);

    if (nodeFeatureTarget === undefined || browserFeatureTarget === undefined) {
      continue;
    }

    if (nodeFeatureTarget.importTarget === browserFeatureTarget.importTarget && nodeFeatureTarget.typesTarget !== browserFeatureTarget.typesTarget) {
      errors.push(`${packageName} ${nodeFeatureSubpath} and ${browserFeatureSubpath} share ${nodeFeatureTarget.importTarget} but declare different type artifacts`);
    }

    const entrypoint = sourceEntrypoint(packageDirectory, packageName, browserFeatureTarget.importTarget);
    if (entrypoint !== undefined) {
      browserEntrypoints.push({ 'entrypoint': entrypoint, 'packageName': packageName });
    }
  }

  const nodeExport = typedExportsMap['./node'];
  const browserExport = typedExportsMap['./browser'];
  if (nodeExport !== undefined && browserExport !== undefined) {
    const nodeTarget = executableTarget(nodeExport, packageName, './node');
    const browserTarget = executableTarget(browserExport, packageName, './browser');
    if (nodeTarget !== undefined && browserTarget !== undefined) {
      if (nodeTarget.importTarget === browserTarget.importTarget && nodeTarget.typesTarget !== browserTarget.typesTarget) {
        errors.push(`${packageName} ./node and ./browser share ${nodeTarget.importTarget} but declare different type artifacts`);
      }

      const entrypoint = sourceEntrypoint(packageDirectory, packageName, browserTarget.importTarget);
      if (entrypoint !== undefined) {
        browserEntrypoints.push({ 'entrypoint': entrypoint, 'packageName': packageName });
      }
    }
  }

  for (const featureName of neutralFeatureNames) {
    if (!await hasSourceFeatureEntrypoint(packageDirectory, featureName)) {
      continue;
    }

    const featureSubpath = `./${featureName}`;
    if (!Object.hasOwn(typedExportsMap, featureSubpath)) {
      errors.push(`${packageName} src/${featureName}/index.ts requires a ${featureSubpath} export`);
      continue;
    }

    const featureTarget = executableTarget(typedExportsMap[featureSubpath], packageName, featureSubpath);
    if (featureTarget === undefined) {
      continue;
    }

    const expectedTarget = `./dist/${featureName}/index`;
    if (featureTarget.importTarget !== `${expectedTarget}.js` || featureTarget.typesTarget !== `${expectedTarget}.d.ts`) {
      errors.push(`${packageName} ${featureSubpath} must target ${expectedTarget}.js and ${expectedTarget}.d.ts`);
    }
  }
  const sourceDirectory = join(packageDirectory, 'src');
  try {
    const sourceFiles = await collectTypeScriptFiles(sourceDirectory);
    for (const sourcePath of sourceFiles) {
      const sourceText = await readFile(sourcePath, 'utf8');
      inspectStaticSpecifiers(ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS));
    }
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      errors.push(`${packageName} has no src directory to inspect`);
    } else {
      throw error;
    }
  }
}

for (const { entrypoint, packageName } of browserEntrypoints) {
  try {
    await stat(entrypoint);
  } catch {
    errors.push(`${packageName} browser export does not resolve to ${relative(repositoryRoot, entrypoint)}`);
  }
}

await walkBrowserGraph();

if (errors.length > 0) {
  throw new AggregateError(errors, `runtime export contract failed with ${String(errors.length)} violation(s)`);
}

if (!validateOnly) {
  for (const { entrypoint, packageName } of browserEntrypoints) {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'substrate-browser-entrypoint-'));
    const outputDirectory = join(temporaryDirectory, 'output');
    const configPath = join(temporaryDirectory, 'vite.config.mjs');
    const config = {
      'build': {
        'lib': {
          'entry': entrypoint,
          'formats': ['es']
        },
        'outDir': outputDirectory
      }
    };

    try {
      await writeFile(
        configPath,
        [
          `const config = ${JSON.stringify(config)};`,
          'config.build.rollupOptions = { external: (specifier) => specifier.startsWith("node:") };',
          'export default config;',
          ''
        ].join('\n')
      );
      await executeFile('pnpm', ['exec', 'vite', 'build', '--config', configPath], { 'cwd': checkerRoot });
      await inspectBrowserBuildOutput(outputDirectory, packageName);
    } finally {
      await rm(temporaryDirectory, { 'force': true, 'recursive': true });
    }
  }
}

console.log(`runtime-exports: OK (${String(packageDirectories.length)} package(s), ${String(browserEntrypoints.length)} browser entrypoint(s))`);
