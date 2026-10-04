import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

interface PackageInfoInterface {
  readonly 'directory': string;
  readonly 'manifest': JsonObject;
  readonly 'name': string;
}

type JsonObject = { readonly [key: string]: unknown };

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packagesRoot = join(repositoryRoot, 'packages');
const workspacePackagePattern = /^@studnicky\/([^/]+)(?:\/.*)?$/u;
const errors: string[] = [];

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(value: string): unknown {
  return JSON.parse(value);
}

function referencedPaths(config: JsonObject): readonly string[] {
  const references = config.references;
  if (!Array.isArray(references)) {
    return [];
  }
  return references
    .filter(isJsonObject)
    .map((reference) => {return reference.path;})
    .filter((path): path is string => {return typeof path === 'string';});
}

function declaredDependencies(manifest: JsonObject): ReadonlySet<string> {
  const names = ['dependencies', 'devDependencies', 'peerDependencies'].flatMap((field) => {
    const value = manifest[field];
    return isJsonObject(value) ? Object.keys(value) : [];
  });
  return new Set(names);
}

function workspaceDependency(specifier: string): string | undefined {
  return workspacePackagePattern.exec(specifier)?.[1];
}

async function collectTypeScriptFiles(directory: string): Promise<readonly string[]> {
  const files: string[] = [];
  const entries = await readdir(directory, { 'withFileTypes': true });
  for (const entry of entries) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTypeScriptFiles(filePath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(filePath);
    }
  }
  return files;
}

function importedSpecifier(node: ts.Node): string | undefined {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
    return node.moduleSpecifier.text;
  }
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1) {
    const [argument] = node.arguments;
    if (argument !== undefined && ts.isStringLiteral(argument)) {
      return argument.text;
    }
  }
  return undefined;
}

function collectImportedWorkspacePackages(sourceFile: ts.SourceFile): ReadonlySet<string> {
  const packages = new Set<string>();
  const visit = (node: ts.Node): void => {
    const specifier = importedSpecifier(node);
    const packageName = specifier === undefined ? undefined : workspaceDependency(specifier);
    if (packageName !== undefined) {
      packages.add(packageName);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return packages;
}
async function importedPackages(files: readonly string[]): Promise<ReadonlySet<string>> {
  const packages = new Set<string>();
  for (const filePath of files) {
    const sourceFile = ts.createSourceFile(filePath, await readFile(filePath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const packageName of collectImportedWorkspacePackages(sourceFile)) {
      packages.add(packageName);
    }
  }
  return packages;
}

function hasReference(references: readonly string[], packageName: string): boolean {
  return references.includes(`../${  packageName}`);
}

async function loadPackages(): Promise<readonly PackageInfoInterface[]> {
  const entries = await readdir(packagesRoot, { 'withFileTypes': true });
  const packages: PackageInfoInterface[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    try {
      const manifest = parseJson(await readFile(join(packagesRoot, entry.name, 'package.json'), 'utf8'));
      if (isJsonObject(manifest) && typeof manifest.name === 'string') {
        packages.push({ 'directory': entry.name, 'manifest': manifest, 'name': manifest.name });
      }
    } catch {
      continue;
    }
  }
  return packages.toSorted((left, right) => {return left.directory.localeCompare(right.directory);});
}

interface DependencyCheckInputInterface {
  readonly 'dependencies': ReadonlySet<string>;
  readonly 'dependency': string;
  readonly 'packageInfo': PackageInfoInterface;
  readonly 'sourceImports': ReadonlySet<string>;
  readonly 'sourceReferences': readonly string[];
  readonly 'testAndSourceReferences': readonly string[];
  readonly 'testImports': ReadonlySet<string>;
}

function reportDependencyErrors(input: DependencyCheckInputInterface): void {
  const { dependencies, dependency, packageInfo, sourceImports, sourceReferences, testAndSourceReferences, testImports } = input;
  if (dependency === packageInfo.directory) {
    return;
  }
  const packageSpecifier = `@studnicky/${dependency}`;
  if (!dependencies.has(packageSpecifier)) {
    errors.push(`packages/${packageInfo.directory}/package.json: missing dependency ${packageSpecifier}`);
  }
  if (sourceImports.has(dependency) && !hasReference(sourceReferences, dependency)) {
    errors.push(`packages/${packageInfo.directory}/tsconfig.json: missing reference ../${dependency} for ${packageSpecifier}`);
  }
  if (testImports.has(dependency) && !hasReference(testAndSourceReferences, dependency)) {
    errors.push(`packages/${packageInfo.directory}/tsconfig.tests.json: missing reference ../${dependency} for ${packageSpecifier}`);
  }
}
async function checkPackage(packageInfo: PackageInfoInterface, packageNames: ReadonlySet<string>): Promise<void> {
  const packageDirectory = join(packagesRoot, packageInfo.directory);
  const sourceConfig = parseJson(await readFile(join(packageDirectory, 'tsconfig.json'), 'utf8'));
  const testConfig = parseJson(await readFile(join(packageDirectory, 'tsconfig.tests.json'), 'utf8'));
  if (!isJsonObject(sourceConfig) || !isJsonObject(testConfig)) {
    errors.push(`packages/${packageInfo.directory}: project references must be JSON objects`);
    return;
  }

  const sourceImports = await importedPackages(await collectTypeScriptFiles(join(packageDirectory, 'src')));
  const testFiles = (await Promise.all(['tests', 'examples'].map(async (directory) => {
    try {
      return await collectTypeScriptFiles(join(packageDirectory, directory));
    } catch {
      return [];
    }
  }))).flat();
  const testImports = await importedPackages(testFiles);
  const sourceReferences = referencedPaths(sourceConfig);
  const testReferences = referencedPaths(testConfig);
  const testAndSourceReferences = [...testReferences, ...sourceReferences];
  const dependencies = declaredDependencies(packageInfo.manifest);

  for (const dependency of new Set([...sourceImports, ...testImports])) {
    if (packageNames.has(dependency)) {
      reportDependencyErrors({ 'dependencies': dependencies, 'dependency': dependency, 'packageInfo': packageInfo, 'sourceImports': sourceImports, 'sourceReferences': sourceReferences, 'testAndSourceReferences': testAndSourceReferences, 'testImports': testImports });
    }
  }
}
const packages = await loadPackages();
const packageNames = new Set(packages.map((packageInfo) => {return packageInfo.directory;}));
await Promise.all(packages.map((packageInfo) => {return checkPackage(packageInfo, packageNames);}));
if (errors.length > 0) {
  errors.toSorted().forEach((error) => { console.error(error); });
  process.exitCode = 1;
}
