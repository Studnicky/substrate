#!/usr/bin/env node
/**
 * check-docs-exports — verifies that package API documentation names only
 * published exports and documents every canonical consumer import path.
 *
 * Package documentation deliberately demonstrates published @studnicky/*
 * specifiers. This script uses the TypeScript compiler's module symbols, not
 * hand-written re-export parsing, to prove those snippets and API tables stay
 * aligned with each package's source entrypoints.
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const resolveRepoRoot = () => {
  const [option, root] = process.argv.slice(2);

  if (option === undefined) {
    return defaultRepoRoot;
  }

  if (option === '--root' && root !== undefined && process.argv.length === 4) {
    return path.resolve(root);
  }

  throw new Error('Usage: check-docs-exports.mjs [--root path]');
};

const repoRoot = resolveRepoRoot();
const packagesRoot = path.join(repoRoot, 'packages');
const docsRoot = path.join(repoRoot, 'docs', 'packages');

const getRuntimeArtifact = (descriptor) => {
  if (typeof descriptor === 'string') {
    return descriptor;
  }
  if (descriptor === null || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    return undefined;
  }
  for (const condition of ['import', 'default', 'node', 'browser']) {
    const artifact = getRuntimeArtifact(descriptor[condition]);
    if (artifact !== undefined) {
      return artifact;
    }
  }
  return undefined;
};

const getSourceRelativePath = (runtimeArtifact) => {
  const artifactPath = runtimeArtifact.replace(/^\.\//u, '');
  if (!artifactPath.startsWith('dist/') || !artifactPath.endsWith('.js')) {
    return undefined;
  }
  return `src/${artifactPath.slice('dist/'.length, -'.js'.length)}.ts`;
};

const packageSpecifier = /^(@studnicky\/[^/]+)(\/.*)?$/u;

const toRelativePath = (file) => path.relative(repoRoot, file).split(path.sep).join('/');

const stripCode = (value) => value.trim().replace(/^`|`$/gu, '');

const documentedSymbolName = (value) => stripCode(value).replace(/^type\s+/u, '').split('<', 1)[0].trim();

const parseImportSnippet = (body) => {
  const sourceFile = ts.createSourceFile('docs-snippet.ts', body, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  if (sourceFile.parseDiagnostics.length > 0 || sourceFile.statements.length === 0) {
    return undefined;
  }

  const imports = [];
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

const getNamedBindings = (declaration) => {
  const clause = declaration.importClause;
  if (clause === undefined || clause.namedBindings === undefined || !ts.isNamedImports(clause.namedBindings)) {
    return [];
  }
  return clause.namedBindings.elements.map((element) => element.propertyName?.text ?? element.name.text);
};

const getDocs = async () => {
  const entries = await readdir(docsRoot, { 'withFileTypes': true });
  const docs = new Map();
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }
    const file = path.join(docsRoot, entry.name);
    docs.set(entry.name.slice(0, -3), { file, content: await readFile(file, 'utf8') });
  }
  return docs;
};

const getPackages = async () => {
  const entries = await readdir(packagesRoot, { 'withFileTypes': true });
  const packages = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const directory = path.join(packagesRoot, entry.name);
    const packageFile = path.join(directory, 'package.json');
    if (!existsSync(packageFile)) {
      continue;
    }
    packages.push({ directory, manifest: JSON.parse(await readFile(packageFile, 'utf8')), name: entry.name, packageFile });
  }
  return packages.toSorted((left, right) => left.name.localeCompare(right.name));
};

const getExportSurface = (packageInfo, violations) => {
  const exportsMap = packageInfo.manifest.exports;
  const subpaths = new Map();

  if (exportsMap === undefined || typeof exportsMap !== 'object' || Array.isArray(exportsMap)) {
    return new Map();
  }

  for (const [subpath, descriptor] of Object.entries(exportsMap)) {
    if (!subpath.startsWith('.')) {
      continue;
    }
    const runtimeArtifact = getRuntimeArtifact(descriptor);
    if (runtimeArtifact === undefined) {
      violations.push({
        file: toRelativePath(packageInfo.packageFile),
        line: 1,
        message: `export ${subpath} has no runtime import artifact.`
      });
      continue;
    }
    const sourceRelativePath = getSourceRelativePath(runtimeArtifact);
    if (sourceRelativePath === undefined) {
      violations.push({
        file: toRelativePath(packageInfo.packageFile),
        line: 1,
        message: `export ${subpath} has an unsupported runtime artifact ${runtimeArtifact}.`
      });
      continue;
    }
    const sourcePath = path.join(packageInfo.directory, sourceRelativePath);
    if (!existsSync(sourcePath)) {
      violations.push({
        file: toRelativePath(packageInfo.packageFile),
        line: 1,
        message: `export ${subpath} has no source entrypoint at ${sourceRelativePath}.`
      });
      continue;
    }
    subpaths.set(subpath, sourcePath);
  }

  const rootNames = [...new Set(subpaths.values())];
  if (rootNames.length === 0) {
    return new Map();
  }

  const configFile = path.join(packageInfo.directory, 'tsconfig.json');
  const config = ts.readConfigFile(configFile, ts.sys.readFile);
  if (config.error !== undefined) {
    violations.push({
      file: toRelativePath(configFile),
      line: 1,
      message: ts.flattenDiagnosticMessageText(config.error.messageText, ' ')
    });
    return new Map();
  }
  const parsedConfig = ts.parseJsonConfigFileContent(config.config, ts.sys, packageInfo.directory);
  const program = ts.createProgram({ rootNames, options: parsedConfig.options });
  const checker = program.getTypeChecker();
  const surface = new Map();

  for (const [subpath, sourcePath] of subpaths) {
    const sourceFile = program.getSourceFile(sourcePath);
    const moduleSymbol = sourceFile === undefined ? undefined : checker.getSymbolAtLocation(sourceFile);
    if (moduleSymbol === undefined) {
      violations.push({
        file: toRelativePath(packageInfo.packageFile),
        line: 1,
        message: `cannot resolve the module symbol for export ${subpath}.`
      });
      continue;
    }
    surface.set(subpath, new Set(checker.getExportsOfModule(moduleSymbol).map((symbol) => symbol.getName())));
  }
  return surface;
};

const getExportsTableRows = (content) => {
  const lines = content.split('\n');
  const headingIndex = lines.findIndex((line) => line.trim() === '## Exports');
  if (headingIndex === -1) {
    return [];
  }
  const headerIndex = lines.findIndex((line, index) => index > headingIndex && line.trim() === '| Symbol | Purpose | Import path |');
  if (headerIndex === -1) {
    return [];
  }

  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('|')) {
      break;
    }
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length === 3) {
      rows.push({ importPath: stripCode(cells[2]), line: index + 1, symbol: documentedSymbolName(cells[0]) });
    }
  }
  return rows;
};

const getTypeScriptFences = (content) => {
  const lines = content.split('\n');
  const fences = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^```typescript\s*$/u.test(lines[index].trim())) {
      continue;
    }
    const end = lines.findIndex((line, candidate) => candidate > index && line.trim() === '```');
    if (end === -1) {
      continue;
    }
    fences.push({ body: lines.slice(index + 1, end).join('\n'), line: index + 1 });
    index = end;
  }
  return fences;
};

const packages = await getPackages();
const docs = await getDocs();
const violations = [];
const packageSurfaces = new Map();
let checked = 0;

for (const packageInfo of packages) {
  const surface = getExportSurface(packageInfo, violations);
  packageSurfaces.set(packageInfo.manifest.name, { packageInfo, surface });
}

const resolveImport = (specifier) => {
  const match = packageSpecifier.exec(specifier);
  if (match === null) {
    return undefined;
  }
  return { packageName: match[1], subpath: match[2] === undefined ? '.' : `.${match[2]}` };
};

const neutralSubpaths = ['./interfaces', './entities', './types'];

const getNeutralCanonicalSubpath = (surface, symbol) => neutralSubpaths.find((subpath) => surface.get(subpath)?.has(symbol));

for (const doc of docs.values()) {
  const file = toRelativePath(doc.file);
  for (const fence of getTypeScriptFences(doc.content)) {
    const imports = parseImportSnippet(fence.body);
    if (imports === undefined) {
      continue;
    }
    for (const declaration of imports) {
      const specifier = declaration.moduleSpecifier.text;
      const resolved = resolveImport(specifier);
      if (resolved === undefined) {
        continue;
      }
      checked += 1;
      const packageSurface = packageSurfaces.get(resolved.packageName);
      const symbols = packageSurface?.surface.get(resolved.subpath);
      if (symbols === undefined) {
        violations.push({ file, line: fence.line, message: `${specifier} is not a published export entrypoint.` });
        continue;
      }
      for (const binding of getNamedBindings(declaration)) {
        checked += 1;
        if (!symbols.has(binding)) {
          violations.push({ file, line: fence.line, message: `${binding} is not exported by ${specifier}.` });
        }
      }
    }
  }

  for (const row of getExportsTableRows(doc.content)) {
    checked += 1;
    const resolved = resolveImport(row.importPath);
    const packageSurface = resolved === undefined ? undefined : packageSurfaces.get(resolved.packageName)?.surface;
    const symbols = resolved === undefined ? undefined : packageSurface?.get(resolved.subpath);
    if (symbols === undefined) {
      violations.push({ file, line: row.line, message: `${row.importPath} is not a published export entrypoint.` });
    } else if (!symbols.has(row.symbol)) {
      violations.push({ file, line: row.line, message: `${row.symbol} is not exported by ${row.importPath}.` });
    } else if (resolved.subpath === './node') {
      const canonicalSubpath = getNeutralCanonicalSubpath(packageSurface, row.symbol);
      if (canonicalSubpath !== undefined) {
        violations.push({
          file,
          line: row.line,
          message: `${row.symbol} must use ${resolved.packageName}${canonicalSubpath.slice(1)} in the Exports table.`
        });
      }
    }
  }
}

for (const packageInfo of packages) {
  const doc = docs.get(packageInfo.name);
  const rows = doc === undefined ? [] : getExportsTableRows(doc.content);
  const packageSurface = packageSurfaces.get(packageInfo.manifest.name)?.surface ?? new Map();
  const runtimeSpecifier = `${packageInfo.manifest.name}/node`;
  const documentedNodeExports = new Set(rows
    .filter((row) => row.importPath === runtimeSpecifier)
    .map((row) => row.symbol));

  for (const symbol of packageSurface.get('./node') ?? []) {
    const canonicalSubpath = getNeutralCanonicalSubpath(packageSurface, symbol);
    if (canonicalSubpath !== undefined) {
      continue;
    }
    checked += 1;
    if (!documentedNodeExports.has(symbol)) {
      violations.push({
        file: doc === undefined ? `docs/packages/${packageInfo.name}.md` : toRelativePath(doc.file),
        line: 1,
        message: `${packageInfo.manifest.name} exports ${symbol} from ${runtimeSpecifier}, but its Exports table does not document it.`
      });
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`check-docs-exports: ${String(violations.length)} documentation export violation(s).\n\n`);
  for (const violation of violations) {
    process.stderr.write(`  ${violation.file}:${String(violation.line)} ${violation.message}\n`);
  }
  process.exit(1);
}

process.stdout.write(`check-docs-exports: OK (${String(checked)} checked).\n`);
