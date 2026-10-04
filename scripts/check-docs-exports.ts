#!/usr/bin/env node
/**
 * check-docs-exports — verifies that package API documentation names only
 * published exports and documents every canonical consumer import path.
 *
 * It resolves each documented `@studnicky/*` import specifier against real
 * TypeScript compiler module symbols, not hand-written re-export parsing, to
 * prove those snippets and API tables stay aligned with each package's
 * source entrypoints.
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const resolveRepoRoot = (): string => {
  const [option, root] = process.argv.slice(2);

  if (option === undefined) {
    return defaultRepoRoot;
  }

  if (option === '--root' && root !== undefined && process.argv.length === 4) {
    const resolvedRoot = path.resolve(root);
    return resolvedRoot;
  }

  throw new Error('Usage: check-docs-exports.ts [--root path]');
};

const repoRoot = resolveRepoRoot();
const packagesRoot = path.join(repoRoot, 'packages');
const docsRoot = path.join(repoRoot, 'docs', 'packages');

interface ViolationInterface {
  readonly 'file': string;
  readonly 'line': number;
  readonly 'message': string;
}

interface PackageManifestInterface {
  readonly 'exports'?: unknown;
  readonly 'name': string;
}

function isPackageManifest(value: unknown): value is PackageManifestInterface {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  if (!('name' in value) || typeof value.name !== 'string') {
    return false;
  }
  return true;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  const result = typeof value === 'object' && value !== null && !Array.isArray(value);
  return result;
}

interface PackageInfoInterface {
  readonly 'directory': string;
  readonly 'manifest': PackageManifestInterface;
  readonly 'name': string;
  readonly 'packageFile': string;
}

interface DocEntryInterface {
  readonly 'content': string;
  readonly 'file': string;
}

interface ExportsTableRowInterface {
  readonly 'importPaths': ReadonlySet<string>;
  readonly 'line': number;
  readonly 'symbol': string;
}

interface PublicEntrypointTableRowInterface {
  readonly 'importPath': string;
  readonly 'line': number;
}

interface TypeScriptFenceInterface {
  readonly 'body': string;
  readonly 'line': number;
}

interface ResolvedImportInterface {
  readonly 'packageName': string;
  readonly 'subpath': string;
}

const RUNTIME_CONDITIONS = ['import', 'default', 'node', 'browser'];

const getRuntimeArtifact = (descriptor: unknown): string | undefined => {
  if (typeof descriptor === 'string') {
    return descriptor;
  }
  if (!isPlainRecord(descriptor)) {
    return undefined;
  }
  for (let index = 0; index < RUNTIME_CONDITIONS.length; index += 1) {
    const condition = RUNTIME_CONDITIONS[index];
    if (condition === undefined) {
      continue;
    }
    const artifact = getRuntimeArtifact(descriptor[condition]);
    if (artifact !== undefined) {
      return artifact;
    }
  }
  return undefined;
};

const getSourceRelativePath = (runtimeArtifact: string): string | undefined => {
  const artifactPath = runtimeArtifact.replace(/^\.\//u, '');
  if (!artifactPath.startsWith('dist/') || !artifactPath.endsWith('.js')) {
    return undefined;
  }
  return `src/${artifactPath.slice('dist/'.length, -'.js'.length)}.ts`;
};

const packageSpecifier = /^(@studnicky\/[^/]+)(\/.*)?$/u;
const CODE_FENCE_MARKER_RE = /^`|`$/gu;
const IMPORT_PATH_SEPARATOR_RE = /<br\s*\/?\s*>/iu;
const TYPE_PREFIX_RE = /^type\s+/u;
const TYPESCRIPT_FENCE_OPEN_RE = /^```typescript\s*$/u;

const documentedSymbolName = (value: string): string => {
  const stripped = value.trim().replace(CODE_FENCE_MARKER_RE, '');
  const withoutTypePrefix = stripped.replace(TYPE_PREFIX_RE, '');
  const name = withoutTypePrefix.split('<', 1)[0]?.trim() ?? '';
  return name;
};

interface SourceFileWithParseDiagnosticsInterface {
  readonly 'parseDiagnostics': readonly unknown[];
}

const parseImportSnippet = (body: string): ts.ImportDeclaration[] | undefined => {
  const sourceFile = ts.createSourceFile(
    'docs-snippet.ts',
    body,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
  const { parseDiagnostics } = sourceFile as SourceFileWithParseDiagnosticsInterface &
    ts.SourceFile;
  if (parseDiagnostics.length > 0 || sourceFile.statements.length === 0) {
    return undefined;
  }

  const imports: ts.ImportDeclaration[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    if (!packageSpecifier.test(statement.moduleSpecifier.text)) {
      continue;
    }
    imports.push(statement);
  }
  return imports;
};

const getNamedBindings = (declaration: ts.ImportDeclaration): string[] => {
  const clause = declaration.importClause;
  if (clause?.namedBindings === undefined || !ts.isNamedImports(clause.namedBindings)) {
    return [];
  }
  const bindings = clause.namedBindings.elements.map((element) => {
    const name = element.propertyName?.text ?? element.name.text;
    return name;
  });
  return bindings;
};

const getDocs = async (): Promise<Map<string, DocEntryInterface>> => {
  const entries = await readdir(docsRoot, { 'withFileTypes': true });
  const docs = new Map<string, DocEntryInterface>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry === undefined || !entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }
    const file = path.join(docsRoot, entry.name);
    docs.set(entry.name.slice(0, -3), { 'content': await readFile(file, 'utf8'), 'file': file });
  }
  return docs;
};

const getPackages = async (): Promise<PackageInfoInterface[]> => {
  const entries = await readdir(packagesRoot, { 'withFileTypes': true });
  const packages: PackageInfoInterface[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry === undefined) {
      continue;
    }
    if (!entry.isDirectory()) {
      continue;
    }
    const directory = path.join(packagesRoot, entry.name);
    const packageFile = path.join(directory, 'package.json');
    if (!existsSync(packageFile)) {
      continue;
    }
    const parsedManifest: unknown = JSON.parse(await readFile(packageFile, 'utf8'));
    if (!isPackageManifest(parsedManifest)) {
      throw new Error(
        `${packageFile} does not have the expected package manifest shape (missing or non-string "name").`
      );
    }
    packages.push({
      'directory': directory,
      'manifest': parsedManifest,
      'name': entry.name,
      'packageFile': packageFile
    });
  }
  const sortedPackages = packages.toSorted((left, right) => {
    const comparison = left.name.localeCompare(right.name);
    return comparison;
  });
  return sortedPackages;
};

const collectExportSubpaths = (
  packageInfo: PackageInfoInterface,
  exportsMap: Record<string, unknown>,
  packageFile: string,
  violations: ViolationInterface[]
): Map<string, string> => {
  const subpaths = new Map<string, string>();
  const exportEntries = Object.entries(exportsMap);
  for (let index = 0; index < exportEntries.length; index += 1) {
    const entry = exportEntries[index];
    if (entry === undefined) {
      continue;
    }
    const [subpath, descriptor] = entry;
    if (!subpath.startsWith('.')) {
      continue;
    }
    const runtimeArtifact = getRuntimeArtifact(descriptor);
    if (runtimeArtifact === undefined) {
      violations.push({
        'file': packageFile,
        'line': 1,
        'message': `export ${subpath} has no runtime import artifact.`
      });
      continue;
    }
    const sourceRelativePath = getSourceRelativePath(runtimeArtifact);
    if (sourceRelativePath === undefined) {
      violations.push({
        'file': packageFile,
        'line': 1,
        'message': `export ${subpath} has an unsupported runtime artifact ${runtimeArtifact}.`
      });
      continue;
    }
    const sourcePath = path.join(packageInfo.directory, sourceRelativePath);
    if (!existsSync(sourcePath)) {
      violations.push({
        'file': packageFile,
        'line': 1,
        'message': `export ${subpath} has no source entrypoint at ${sourceRelativePath}.`
      });
      continue;
    }
    subpaths.set(subpath, sourcePath);
  }
  return subpaths;
};

interface TypeCheckerContextInterface {
  readonly 'checker': ts.TypeChecker;
  readonly 'program': ts.Program;
}

const buildTypeCheckerContext = (
  packageInfo: PackageInfoInterface,
  rootNames: string[],
  violations: ViolationInterface[]
): TypeCheckerContextInterface | undefined => {
  const configFile = path.join(packageInfo.directory, 'tsconfig.json');
  const config = ts.readConfigFile(configFile, ts.sys.readFile);
  if (config.error !== undefined) {
    violations.push({
      'file': path.relative(repoRoot, configFile).split(path.sep).join('/'),
      'line': 1,
      'message': ts.flattenDiagnosticMessageText(config.error.messageText, ' ')
    });
    return undefined;
  }
  const parsedConfig = ts.parseJsonConfigFileContent(config.config, ts.sys, packageInfo.directory);
  const program = ts.createProgram({ 'options': parsedConfig.options, 'rootNames': rootNames });
  return { 'checker': program.getTypeChecker(), 'program': program };
};

const collectExportedNamesBySubpath = (
  context: TypeCheckerContextInterface,
  subpaths: Map<string, string>,
  packageFile: string,
  violations: ViolationInterface[]
): Map<string, Set<string>> => {
  const surface = new Map<string, Set<string>>();
  for (const [subpath, sourcePath] of subpaths) {
    const sourceFile = context.program.getSourceFile(sourcePath);
    const moduleSymbol =
      sourceFile === undefined ? undefined : context.checker.getSymbolAtLocation(sourceFile);
    if (moduleSymbol === undefined) {
      violations.push({
        'file': packageFile,
        'line': 1,
        'message': `cannot resolve the module symbol for export ${subpath}.`
      });
      continue;
    }
    const exportedNames = context.checker.getExportsOfModule(moduleSymbol).map((symbol) => {
      const name = symbol.getName();
      return name;
    });
    surface.set(subpath, new Set(exportedNames));
  }
  return surface;
};

const getExportSurface = (
  packageInfo: PackageInfoInterface,
  violations: ViolationInterface[]
): Map<string, Set<string>> => {
  const exportsMap = packageInfo.manifest.exports;
  const packageFile = path.relative(repoRoot, packageInfo.packageFile).split(path.sep).join('/');

  if (!isPlainRecord(exportsMap)) {
    return new Map();
  }

  const subpaths = collectExportSubpaths(packageInfo, exportsMap, packageFile, violations);
  const rootNames = [...new Set(subpaths.values())];
  if (rootNames.length === 0) {
    return new Map();
  }

  const context = buildTypeCheckerContext(packageInfo, rootNames, violations);
  if (context === undefined) {
    return new Map();
  }

  return collectExportedNamesBySubpath(context, subpaths, packageFile, violations);
};

const getExportsTableRows = (content: string): ExportsTableRowInterface[] => {
  const lines = content.split('\n');
  const headingIndex = lines.findIndex((line) => {
    const isHeading = line.trim() === '## Exports';
    return isHeading;
  });
  if (headingIndex === -1) {
    return [];
  }
  const headerIndex = lines.findIndex((line, index) => {
    const isHeader =
      index > headingIndex &&
      line.trim().replace(/\s+/gu, ' ') === '| Symbol | Purpose | Import path |';
    return isHeader;
  });
  if (headerIndex === -1) {
    return [];
  }

  const rows: ExportsTableRowInterface[] = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    if (!line.startsWith('|')) {
      break;
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => {
        const trimmed = cell.trim();
        return trimmed;
      });
    if (cells.length === 3) {
      const [symbolCell, , importPathCell] = cells;
      const importPaths = (importPathCell ?? '').split(IMPORT_PATH_SEPARATOR_RE).map((value) => {
        const stripped = value.trim().replace(CODE_FENCE_MARKER_RE, '');
        return stripped;
      });
      rows.push({
        'importPaths': new Set(importPaths),
        'line': index + 1,
        'symbol': documentedSymbolName(symbolCell ?? '')
      });
    }
  }
  return rows;
};

const getPublicEntrypointHeaderIndex = (lines: string[]): number => {
  const headingIndex = lines.findIndex((line) => {
    return line.trim() === '## Public entrypoints';
  });
  return lines.findIndex((line, index) => {
    return (
      index > headingIndex && line.trim().replace(/\s+/gu, ' ') === '| Import path | Use it when |'
    );
  });
};

const parsePublicEntrypointRow = (
  line: string,
  lineNumber: number
): PublicEntrypointTableRowInterface | undefined => {
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => {
      return cell.trim();
    });
  const importPath = cells[0]?.replace(CODE_FENCE_MARKER_RE, '') ?? '';
  return cells.length === 2 && importPath !== ''
    ? { 'importPath': importPath, 'line': lineNumber }
    : undefined;
};

const getPublicEntrypointRows = (content: string): PublicEntrypointTableRowInterface[] => {
  const lines = content.split('\n');
  const headerIndex = getPublicEntrypointHeaderIndex(lines);
  if (headerIndex === -1) {
    return [];
  }

  const rows: PublicEntrypointTableRowInterface[] = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    if (!line.startsWith('|')) {
      break;
    }
    const row = parsePublicEntrypointRow(line, index + 1);
    if (row !== undefined) {
      rows.push(row);
    }
  }
  return rows;
};

const getTypeScriptFences = (content: string): TypeScriptFenceInterface[] => {
  const lines = content.split('\n');
  const fences: TypeScriptFenceInterface[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!TYPESCRIPT_FENCE_OPEN_RE.test(lines[index]?.trim() ?? '')) {
      continue;
    }
    const end = lines.findIndex((line, candidate) => {
      const isClose = candidate > index && line.trim() === '```';
      return isClose;
    });
    if (end === -1) {
      continue;
    }
    fences.push({ 'body': lines.slice(index + 1, end).join('\n'), 'line': index + 1 });
    index = end;
  }
  return fences;
};

const packages = await getPackages();
const docs = await getDocs();
const violations: ViolationInterface[] = [];
const packageSurfaces = new Map<
  string,
  { 'packageInfo': PackageInfoInterface; 'surface': Map<string, Set<string>> }
>();
let checked = 0;

for (let index = 0; index < packages.length; index += 1) {
  const packageInfo = packages[index];
  if (packageInfo === undefined) {
    continue;
  }
  const surface = getExportSurface(packageInfo, violations);
  packageSurfaces.set(packageInfo.manifest.name, { 'packageInfo': packageInfo, 'surface': surface });
}

const resolveImport = (specifier: string): ResolvedImportInterface | undefined => {
  const match = packageSpecifier.exec(specifier);
  if (match === null) {
    return undefined;
  }
  return { 'packageName': match[1] ?? '', 'subpath': match[2] === undefined ? '.' : `.${match[2]}` };
};

const neutralSubpaths = ['./interfaces', './entities', './types'];

const getNeutralCanonicalSubpath = (
  surface: Map<string, Set<string>>,
  symbol: string
): string | undefined => {
  const canonicalSubpath = neutralSubpaths.find((subpath) => {
    const hasSymbol = surface.get(subpath)?.has(symbol) === true;
    return hasSymbol;
  });
  return canonicalSubpath;
};

interface FenceBindingCheckContextInterface {
  readonly 'fenceLine': number;
  readonly 'file': string;
  readonly 'specifier': string;
}

const checkNamedBindingsAgainstSurface = (
  namedBindings: string[],
  symbols: Set<string>,
  context: FenceBindingCheckContextInterface,
  violationsOut: ViolationInterface[]
): number => {
  let bindingsChecked = 0;
  for (let bindingIndex = 0; bindingIndex < namedBindings.length; bindingIndex += 1) {
    const binding = namedBindings[bindingIndex];
    if (binding === undefined) {
      continue;
    }
    bindingsChecked += 1;
    if (!symbols.has(binding)) {
      violationsOut.push({
        'file': context.file,
        'line': context.fenceLine,
        'message': `${binding} is not exported by ${context.specifier}.`
      });
    }
  }
  return bindingsChecked;
};

interface RowImportResolutionInterface {
  readonly 'packageSurface': Map<string, Set<string>> | undefined;
  readonly 'resolved': ResolvedImportInterface | undefined;
  readonly 'symbols': Set<string> | undefined;
}

const resolveRowImportPath = (importPath: string): RowImportResolutionInterface => {
  const resolved = resolveImport(importPath);
  if (resolved === undefined) {
    return { 'packageSurface': undefined, 'resolved': undefined, 'symbols': undefined };
  }
  const packageSurface = packageSurfaces.get(resolved.packageName)?.surface;
  const symbols = packageSurface?.get(resolved.subpath);
  return { 'packageSurface': packageSurface, 'resolved': resolved, 'symbols': symbols };
};

const isPublishedPackageEntrypoint = (
  resolved: ResolvedImportInterface | undefined,
  packageName: string,
  packageSurface: Map<string, Set<string>>
): boolean => {
  if (resolved?.packageName !== packageName) {
    return false;
  }
  return packageSurface.has(resolved.subpath);
};

const checkTableRowImportPath = (
  importPath: string,
  row: ExportsTableRowInterface,
  file: string,
  violationsOut: ViolationInterface[]
): void => {
  const { packageSurface, resolved, symbols } = resolveRowImportPath(importPath);
  if (symbols === undefined || resolved === undefined) {
    violationsOut.push({
      'file': file,
      'line': row.line,
      'message': `${importPath} is not a published export entrypoint.`
    });
    return;
  }
  if (!symbols.has(row.symbol)) {
    violationsOut.push({
      'file': file,
      'line': row.line,
      'message': `${row.symbol} is not exported by ${importPath}.`
    });
    return;
  }
  if (resolved.subpath === './node' && packageSurface !== undefined) {
    const canonicalSubpath = getNeutralCanonicalSubpath(packageSurface, row.symbol);
    if (canonicalSubpath !== undefined) {
      violationsOut.push({
        'file': file,
        'line': row.line,
        'message': `${row.symbol} must use ${resolved.packageName}${canonicalSubpath.slice(1)} in the Exports table.`
      });
    }
  }
};

for (const doc of docs.values()) {
  const file = path.relative(repoRoot, doc.file).split(path.sep).join('/');
  const fences = getTypeScriptFences(doc.content);
  for (let fenceIndex = 0; fenceIndex < fences.length; fenceIndex += 1) {
    const fence = fences[fenceIndex];
    if (fence === undefined) {
      continue;
    }
    const imports = parseImportSnippet(fence.body);
    if (imports === undefined) {
      continue;
    }
    for (let importIndex = 0; importIndex < imports.length; importIndex += 1) {
      const declaration = imports[importIndex];
      if (declaration === undefined || !ts.isStringLiteral(declaration.moduleSpecifier)) {
        continue;
      }
      const specifier = declaration.moduleSpecifier.text;
      const resolved = resolveImport(specifier);
      if (resolved === undefined) {
        continue;
      }
      checked += 1;
      const packageSurface = packageSurfaces.get(resolved.packageName);
      const symbols = packageSurface?.surface.get(resolved.subpath);
      if (symbols === undefined) {
        violations.push({
          'file': file,
          'line': fence.line,
          'message': `${specifier} is not a published export entrypoint.`
        });
        continue;
      }
      const namedBindings = getNamedBindings(declaration);
      checked += checkNamedBindingsAgainstSurface(
        namedBindings,
        symbols,
        { 'fenceLine': fence.line, 'file': file, 'specifier': specifier },
        violations
      );
    }
  }

  const rows = getExportsTableRows(doc.content);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (row === undefined) {
      continue;
    }
    for (const importPath of row.importPaths) {
      checked += 1;
      checkTableRowImportPath(importPath, row, file, violations);
    }
  }
}

for (let index = 0; index < packages.length; index += 1) {
  const packageInfo = packages[index];
  if (packageInfo === undefined) {
    continue;
  }
  const doc = docs.get(packageInfo.name);
  const rows = doc === undefined ? [] : getExportsTableRows(doc.content);
  const packageSurface =
    packageSurfaces.get(packageInfo.manifest.name)?.surface ?? new Map<string, Set<string>>();
  const file =
    doc === undefined
      ? `docs/packages/${packageInfo.name}.md`
      : path.relative(repoRoot, doc.file).split(path.sep).join('/');
  const publicEntrypoints = doc === undefined ? [] : getPublicEntrypointRows(doc.content);
  const requiredSections = [
    'What it is',
    'What it is for',
    'Northstar Books examples',
    'Public entrypoints',
    'Exports'
  ];
  for (let sectionIndex = 0; sectionIndex < requiredSections.length; sectionIndex += 1) {
    const section = requiredSections[sectionIndex];
    if (section === undefined || (doc?.content.includes(`## ${section}`) ?? false)) {
      continue;
    }
    violations.push({
      'file': file,
      'line': 1,
      'message': `package documentation must include a ## ${section} section.`
    });
  }
  const documentedEntrypoints = new Map<string, number>();
  for (let rowIndex = 0; rowIndex < publicEntrypoints.length; rowIndex += 1) {
    const row = publicEntrypoints[rowIndex];
    if (row === undefined) {
      continue;
    }
    checked += 1;
    if (documentedEntrypoints.has(row.importPath)) {
      violations.push({
        'file': file,
        'line': row.line,
        'message': `${row.importPath} is documented more than once in Public entrypoints.`
      });
      continue;
    }
    documentedEntrypoints.set(row.importPath, row.line);
    const resolved = resolveImport(row.importPath);
    if (!isPublishedPackageEntrypoint(resolved, packageInfo.manifest.name, packageSurface)) {
      violations.push({
        'file': file,
        'line': row.line,
        'message': `${row.importPath} is not a published entrypoint of ${packageInfo.manifest.name}.`
      });
    }
  }
  for (const subpath of packageSurface.keys()) {
    const importPath = `${packageInfo.manifest.name}${subpath.slice(1)}`;
    checked += 1;
    if (!documentedEntrypoints.has(importPath)) {
      violations.push({
        'file': file,
        'line': 1,
        'message': `${importPath} is missing from Public entrypoints.`
      });
    }
  }
  const runtimeSpecifier = `${packageInfo.manifest.name}/node`;
  const documentedNodeExports = new Set<string>();
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (row === undefined) {
      continue;
    }
    if (row.importPaths.has(runtimeSpecifier)) {
      documentedNodeExports.add(row.symbol);
    }
  }

  for (const symbol of packageSurface.get('./node') ?? []) {
    const canonicalSubpath = getNeutralCanonicalSubpath(packageSurface, symbol);
    if (canonicalSubpath !== undefined) {
      continue;
    }
    checked += 1;
    if (!documentedNodeExports.has(symbol)) {
      violations.push({
        'file':
          doc === undefined
            ? `docs/packages/${packageInfo.name}.md`
            : path.relative(repoRoot, doc.file).split(path.sep).join('/'),
        'line': 1,
        'message': `${packageInfo.manifest.name} exports ${symbol} from ${runtimeSpecifier}, but its Exports table does not document it.`
      });
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(
    `check-docs-exports: ${String(violations.length)} documentation export violation(s).\n\n`
  );
  for (let index = 0; index < violations.length; index += 1) {
    const violation = violations[index];
    if (violation === undefined) {
      continue;
    }
    process.stderr.write(`  ${violation.file}:${String(violation.line)} ${violation.message}\n`);
  }
  process.exit(1);
}

process.stdout.write(`check-docs-exports: OK (${String(checked)} checked).\n`);
