#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

interface PackageManifestInterface {
  readonly 'name': string;
}

interface PackagePayloadInterface {
  readonly 'graph': Record<string, string[]>;
  readonly 'rootDir': string;
  readonly 'sourceFiles': string[];
}

interface DependencyGraphInterface {
  readonly 'edges': string[];
  readonly 'packages': string[];
}

interface MermaidHighlightsInterface {
  readonly 'impactedHops'?: Map<string, number>;
  readonly 'missingTests'?: Set<string>;
  readonly 'statuses'?: Map<string, Set<string>>;
}

interface BlastRadiusAnalysisInterface {
  readonly 'impacted': string[];
  readonly 'impactedHops': Map<string, number>;
  readonly 'missingTests': Set<string>;
  readonly 'statuses': Map<string, Set<string>>;
  readonly 'testCounts': Map<string, number>;
  readonly 'touched': string[];
}

interface BlastRadiusCommentInterface {
  readonly 'body': string;
  readonly 'mermaid': string;
  readonly 'truncated': boolean;
}

const repoRoot = process.cwd();
const docsPath = path.join(repoRoot, 'docs', 'dependency-graph.md');
const args = new Set(process.argv.slice(2));
const checkMode = args.has('--check');
const blastRadiusMode = args.has('--blast-radius');

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function isPackageManifest(value: unknown): value is PackageManifestInterface {
  return typeof value === 'object' && value !== null && typeof (value as { 'name'?: unknown }).name === 'string';
}

function listPackageDirs(): string[] {
  return readdirSync(path.join(repoRoot, 'packages'), { 'withFileTypes': true })
    .filter((entry) => {return entry.isDirectory();})
    .map((entry) => {return path.join(repoRoot, 'packages', entry.name);})
    .filter((dir) => {return existsSync(path.join(dir, 'package.json'));});
}

function packageNameFromDir(dir: string): string {
  const manifest = readJson(path.join(dir, 'package.json'));
  if (!isPackageManifest(manifest)) {
    throw new Error(`${dir}/package.json is missing a string "name" field.`);
  }
  return manifest.name;
}

function tsconfigFromDir(dir: string): string | null {
  const candidate = path.join(dir, 'tsconfig.json');
  return existsSync(candidate) ? candidate : null;
}

function compilerOptionsFromTsconfig(tsconfigPath: string): ts.CompilerOptions {
  const configResult = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configResult.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(configResult.error.messageText, '\n'));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(configResult.config, ts.sys, path.dirname(tsconfigPath));
  if (parsedConfig.errors.length > 0) {
    throw new Error(ts.flattenDiagnosticMessageText(parsedConfig.errors[0]?.messageText ?? 'Unable to parse tsconfig.', '\n'));
  }

  return parsedConfig.options;
}

function resolvePackage(filePath: string, packageDirs: string[], packageByDir: Map<string, string>, baseDir: string): string | null {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(baseDir, filePath);
  for (const dir of packageDirs) {
    const prefix = `${dir}${path.sep}`;
    if (resolved.startsWith(prefix)) {
      return packageByDir.get(dir) ?? null;
    }
  }
  return null;
}

function entrypointsFromDir(dir: string): string[] {
  const sourceDir = path.join(dir, 'src');
  const candidates = [
    path.join(sourceDir, 'index.ts'),
    path.join(sourceDir, 'node', 'index.ts'),
    path.join(sourceDir, 'browser', 'index.ts')
  ];
  const entrypoints = candidates.filter((candidate) => {return existsSync(candidate);});
  return entrypoints.length > 0 ? entrypoints : [sourceDir];
}

function sourceFilesFromGraph(graph: Record<string, string[]>, entrypoints: string[]): string[] {
  const sourceFiles = new Set<string>(entrypoints.filter((entrypoint) => {return existsSync(entrypoint) && path.extname(entrypoint) !== ''; }));
  for (const file of Object.keys(graph)) {
    if (existsSync(file)) {
      sourceFiles.add(file);
    }
  }
  return [...sourceFiles].toSorted();
}

function importExportSpecifierText(node: ts.Node): string | undefined {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
    return node.moduleSpecifier.text;
  }
  return undefined;
}

function importEqualsSpecifierText(node: ts.Node): string | undefined {
  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression !== undefined && ts.isStringLiteral(node.moduleReference.expression)) {
    return node.moduleReference.expression.text;
  }
  return undefined;
}

function importTypeSpecifierText(node: ts.Node): string | undefined {
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
    return node.argument.literal.text;
  }
  return undefined;
}

// Each extractor guards a disjoint ts.Node shape; at most one matches per node.
const moduleSpecifierExtractors: readonly ((node: ts.Node) => string | undefined)[] = [
  importExportSpecifierText,
  importEqualsSpecifierText,
  importTypeSpecifierText
];

function staticModuleSpecifiers(sourcePath: string): Set<string> {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    readFileSync(sourcePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    path.extname(sourcePath) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const specifiers = new Set<string>();

  const visit = (node: ts.Node): void => {
    for (const extractor of moduleSpecifierExtractors) {
      const specifier = extractor(node);
      if (specifier !== undefined) {
        specifiers.add(specifier);
        break;
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return specifiers;
}

function isWithinDirectory(filePath: string, directory: string): boolean {
  const relativePath = path.relative(directory, filePath);
  return relativePath !== '' && !relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath);
}

function nativeGraph(entrypoints: string[], sourceDir: string, compilerOptions: ts.CompilerOptions): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  const pending = [...entrypoints];

  while (pending.length > 0) {
    const sourcePath = pending.pop();
    if (sourcePath === undefined || graph[sourcePath] !== undefined || !existsSync(sourcePath)) {
      continue;
    }

    const dependencies = new Set<string>();
    for (const specifier of staticModuleSpecifiers(sourcePath)) {
      const resolvedModule = ts.resolveModuleName(specifier, sourcePath, compilerOptions, ts.sys).resolvedModule;
      if (resolvedModule === undefined) {
        continue;
      }
      dependencies.add(resolvedModule.resolvedFileName);
      if (isWithinDirectory(resolvedModule.resolvedFileName, sourceDir)) {
        pending.push(resolvedModule.resolvedFileName);
      }
    }
    graph[sourcePath] = [...dependencies].toSorted();
  }

  return graph;
}

function buildPackageToFiles(packageDirs: string[], packageByDir: Map<string, string>): Map<string, PackagePayloadInterface> {
  const packageToFiles = new Map<string, PackagePayloadInterface>();

  for (const dir of packageDirs) {
    const tsconfigPath = tsconfigFromDir(dir);
    const entrypoints = entrypointsFromDir(dir);
    const firstEntrypoint = entrypoints[0];
    if (tsconfigPath === null || firstEntrypoint === undefined || !existsSync(firstEntrypoint)) {
      continue;
    }

    const graph = nativeGraph(entrypoints, path.join(dir, 'src'), compilerOptionsFromTsconfig(tsconfigPath));

    const packageName = packageByDir.get(dir);
    if (packageName === undefined) {
      continue;
    }

    packageToFiles.set(packageName, {
      'graph': graph,
      'rootDir': path.join(dir, 'src'),
      'sourceFiles': sourceFilesFromGraph(graph, entrypoints)
    });
  }

  return packageToFiles;
}

interface PackageResolutionContextInterface {
  readonly 'packageByDir': Map<string, string>;
  readonly 'packageDirs': string[];
}

function collectGraphEdges(
  packageName: string,
  payload: PackagePayloadInterface,
  resolutionContext: PackageResolutionContextInterface,
  edges: Set<string>
): void {
  for (const [file, dependencies] of Object.entries(payload.graph)) {
    const fromPackage = resolvePackage(file, resolutionContext.packageDirs, resolutionContext.packageByDir, payload.rootDir);
    if (fromPackage !== packageName) {
      continue;
    }

    for (const dependency of dependencies) {
      const toPackage = resolvePackage(dependency, resolutionContext.packageDirs, resolutionContext.packageByDir, payload.rootDir);
      if (toPackage !== null && toPackage !== fromPackage) {
        edges.add([fromPackage, toPackage].join(' -> '));
      }
    }
  }
}

function buildGraph(): DependencyGraphInterface {
  const packageDirs = listPackageDirs();
  const packageByDir = new Map(packageDirs.map((dir) => {return [dir, packageNameFromDir(dir)];}));
  const packageToFiles = buildPackageToFiles(packageDirs, packageByDir);
  const resolutionContext: PackageResolutionContextInterface = { 'packageByDir': packageByDir, 'packageDirs': packageDirs };

  const edges = new Set<string>();
  for (const [packageName, payload] of packageToFiles.entries()) {
    collectGraphEdges(packageName, payload, resolutionContext, edges);
  }

  return {
    'edges': [...edges].toSorted(),
    'packages': [...packageByDir.values()].toSorted()
  };
}

function sanitizeNodeId(value: string): string {
  return `p_${value.replace(/[^A-Za-z0-9_]/gu, '_')}`;
}

const STATUS_PRIORITY = ['added', 'modified', 'deleted'];
const BLAST_FILLS = ['#e28c36', '#e2a363', '#e5b98d', '#eacfb4', '#f2e6d9'];
const BLAST_STROKE = '#ad661f';

function blastFill(hop: number, maxHop: number): string {
  const ratio = maxHop <= 1 ? 0 : (hop - 1) / (maxHop - 1);
  return BLAST_FILLS[Math.round(ratio * (BLAST_FILLS.length - 1))] ?? '#e28c36';
}

function contrastText(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((index) => {return Number.parseInt(hex.slice(index, index + 2), 16);});
  return ((r ?? 0) * 299 + (g ?? 0) * 587 + (b ?? 0) * 114) / 1000 >= 128 ? '#000000' : '#ffffff';
}

function statusForPackage(packageName: string, statusMap: Map<string, Set<string>>): string | null {
  const statuses = statusMap.get(packageName) ?? new Set();
  return STATUS_PRIORITY.find((status) => {return statuses.has(status);}) ?? null;
}

function collectNodeIds(lines: string[]): Set<string> {
  const nodeIds = new Set<string>();
  for (const line of lines) {
    for (const part of line.trim().split(/\s+-->\s+|\s+-\.->\s+/u)) {
      const match = /^([A-Za-z0-9_]+)/u.exec(part);
      if (match?.[1] !== undefined) {
        nodeIds.add(match[1]);
      }
    }
  }
  return nodeIds;
}

interface GraphLinesResultInterface {
  readonly 'graphLines': string[];
  readonly 'keptNodeIds': Set<string>;
}

interface ClassAssignmentsResultInterface {
  readonly 'classLines': string[];
  readonly 'presentHops': Set<number>;
  readonly 'presentStatuses': Set<string>;
}

interface MissingTestNotesResultInterface {
  readonly 'missingTestNoteCount': number;
  readonly 'noteLines': string[];
}

function computeGraphLines(packages: string[], edges: string[], packageSet: Set<string>): GraphLinesResultInterface {
  const nodeLines = packages.map((name) => {return `${sanitizeNodeId(name)}["${name}"]`;}).toSorted();
  const mermaidEdges = edges.filter((edge) => {
    const [from, to] = edge.split(' -> ');
    return from !== undefined && to !== undefined && packageSet.has(from) && packageSet.has(to);
  }).map((edge) => {
    const [from, to] = edge.split(' -> ');
    return `${sanitizeNodeId(from ?? '')} --> ${sanitizeNodeId(to ?? '')}`;
  }).toSorted();

  const graphLines = [...nodeLines, ...mermaidEdges];
  return { 'graphLines': graphLines, 'keptNodeIds': collectNodeIds(graphLines) };
}

function computeClassAssignments(
  packages: string[],
  keptNodeIds: Set<string>,
  statuses: Map<string, Set<string>>,
  impactedHops: Map<string, number>
): ClassAssignmentsResultInterface {
  const presentStatuses = new Set<string>();
  const presentHops = new Set<number>();
  const classLines: string[] = [];

  for (const name of packages) {
    const nodeId = sanitizeNodeId(name);
    if (!keptNodeIds.has(nodeId)) {
      continue;
    }

    const status = statusForPackage(name, statuses);
    if (status !== null) {
      classLines.push(`class ${nodeId} ${status}`);
      presentStatuses.add(status);
      continue;
    }

    const hop = impactedHops.get(name);
    if (hop !== undefined) {
      classLines.push(`class ${nodeId} impacted_${hop}`);
      presentHops.add(hop);
    }
  }

  return { 'classLines': classLines, 'presentHops': presentHops, 'presentStatuses': presentStatuses };
}

function computeClassDefinitions(presentStatuses: Set<string>, presentHops: Set<number>): string[] {
  const classDefinitions: string[] = [];
  const statusStyles = new Map([
    ['added', 'fill:#d4edda,stroke:#28a745,color:#155724'],
    ['deleted', 'fill:#f8d7da,stroke:#dc3545,color:#842029,stroke-dasharray:5 5'],
    ['modified', 'fill:#fff3cd,stroke:#856404,color:#664d03']
  ]);
  for (const status of STATUS_PRIORITY) {
    if (presentStatuses.has(status)) {
      classDefinitions.push(`classDef ${status} ${statusStyles.get(status) ?? ''}`);
    }
  }

  const maxHopSeen = presentHops.size > 0 ? Math.max(...presentHops) : 1;
  for (const hop of [...presentHops].toSorted((a, b) => {return a - b;})) {
    const fill = blastFill(hop, maxHopSeen);
    classDefinitions.push(`classDef impacted_${hop} fill:${fill},stroke:${BLAST_STROKE},color:${contrastText(fill)}`);
  }

  return classDefinitions;
}

function computeMissingTestNotes(missingTests: Set<string>, keptNodeIds: Set<string>): MissingTestNotesResultInterface {
  const noteLines: string[] = [];
  let missingTestNoteCount = 0;
  for (const name of [...missingTests].toSorted()) {
    const nodeId = sanitizeNodeId(name);
    if (!keptNodeIds.has(nodeId)) {
      continue;
    }
    const noteId = `note_tests_${nodeId}`;
    noteLines.push(`${noteId}["No package tests detected for ${name}"]:::notest`);
    noteLines.push(`${noteId} -.-> ${nodeId}`);
    missingTestNoteCount += 1;
  }
  return { 'missingTestNoteCount': missingTestNoteCount, 'noteLines': noteLines };
}

function computeLegendLines(presentStatuses: Set<string>, presentHops: Set<number>, missingTestNoteCount: number): string[] {
  const legendLines: string[] = [];
  const legendLabels = new Map([
    ['added', 'Package contains added files'],
    ['deleted', 'Package contains deleted files'],
    ['modified', 'Package contains modified files']
  ]);
  for (const status of STATUS_PRIORITY) {
    if (presentStatuses.has(status)) {
      legendLines.push(`legend_${status}["${legendLabels.get(status) ?? ''}"]:::${status}`);
    }
  }
  for (const hop of [...presentHops].toSorted((a, b) => {return a - b;})) {
    legendLines.push(`legend_impacted_${hop}["Impacted ${hop === 1 ? '1 hop' : `${hop} hops`} away"]:::impacted_${hop}`);
  }
  if (missingTestNoteCount > 0) {
    legendLines.push('legend_notest["No package tests detected"]:::notest');
  }
  return legendLines;
}

function buildMermaid(packages: string[], edges: string[], highlights: MermaidHighlightsInterface = {}): string {
  const packageSet = new Set(packages);
  const statuses = highlights.statuses ?? new Map<string, Set<string>>();
  const impactedHops = highlights.impactedHops ?? new Map<string, number>();
  const missingTests = highlights.missingTests ?? new Set<string>();

  const { graphLines, keptNodeIds } = computeGraphLines(packages, edges, packageSet);
  const { classLines, presentHops, presentStatuses } = computeClassAssignments(packages, keptNodeIds, statuses, impactedHops);
  const classDefinitions = computeClassDefinitions(presentStatuses, presentHops);
  const { missingTestNoteCount, noteLines } = computeMissingTestNotes(missingTests, keptNodeIds);
  if (missingTestNoteCount > 0) {
    classDefinitions.push('classDef notest fill:#fdecea,stroke:#c0392b,color:#7a1f1f,stroke-dasharray:3 3');
  }
  const legendLines = computeLegendLines(presentStatuses, presentHops, missingTestNoteCount);

  return [
    'flowchart LR',
    ...classDefinitions,
    ...graphLines,
    ...noteLines,
    ...classLines,
    ...(legendLines.length > 0 ? ['subgraph Legend', ...legendLines.map((line) => {return `  ${line}`;}), 'end'] : [])
  ].join('\n');
}

function listText(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'none';
}

function buildMarkdown(packages: string[], edges: string[]): string {
  const mermaid = buildMermaid(packages, edges);

  return [
    '# Workspace Dependency Graph',
    '',
    'Generated from TypeScript module resolution over static imports reachable from each package entrypoint.',
    '',
    '```mermaid',
    mermaid,
    '```',
    ''
  ].join('\n');
}

function buildBlastRadiusMermaid(graph: DependencyGraphInterface, analysis: BlastRadiusAnalysisInterface): string {
  const packages = analysis.impacted.length > 0 ? analysis.impacted : ['No package changes detected'];
  const edges = analysis.impacted.length > 0
    ? graph.edges.filter((edge) => {
      const [from, to] = edge.split(' -> ');
      return from !== undefined && to !== undefined && analysis.impacted.includes(from) && analysis.impacted.includes(to);
    })
    : [];
  return analysis.impacted.length > 0
    ? buildMermaid(packages, edges, {
      'impactedHops': analysis.impactedHops,
      'missingTests': analysis.missingTests,
      'statuses': analysis.statuses
    })
    : buildMermaid(packages, []);
}

function testedSummary(analysis: BlastRadiusAnalysisInterface): string {
  const impacted = analysis.impacted.length;
  if (impacted === 0) {
    return 'none';
  }
  const withTests = analysis.impacted.filter((pkg) => {return (analysis.testCounts.get(pkg) ?? 0) > 0;}).length;
  return `${withTests}/${impacted} impacted package(s) have package tests`;
}

function buildBlastRadiusMarkdown(graph: DependencyGraphInterface, baseRef: string, analysis: BlastRadiusAnalysisInterface): string {
  const mermaid = buildBlastRadiusMermaid(graph, analysis);

  return [
    '# Dependency Blast Radius',
    '',
    `Base ref: \`${baseRef}\``,
    '',
    `Touched packages: ${listText(analysis.touched)}`,
    '',
    `Impacted packages: ${listText(analysis.impacted)}`,
    '',
    `Package test signal: ${testedSummary(analysis)}`,
    '',
    '```mermaid',
    mermaid,
    '```',
    '',
    ''
  ].join('\n');
}

function truncateMermaidForComment(mermaid: string, header: string, footer: string): { 'mermaid': string; 'truncated': boolean } {
  const maxBodyLength = 60000;
  const body = `${header}${mermaid}${footer}`;
  if (body.length <= maxBodyLength) {
    return { 'mermaid': mermaid, 'truncated': false };
  }

  const budget = maxBodyLength - header.length - footer.length - 90;
  const kept: string[] = [];
  let total = 0;
  for (const line of mermaid.split('\n')) {
    if (total + line.length + 1 > budget) {
      break;
    }
    kept.push(line);
    total += line.length + 1;
  }
  kept.push('  note_truncated["diagram truncated to fit GitHub comment size"]');
  return { 'mermaid': kept.join('\n'), 'truncated': true };
}

function buildBlastRadiusComment(graph: DependencyGraphInterface, baseRef: string, analysis: BlastRadiusAnalysisInterface): BlastRadiusCommentInterface {
  const mermaid = buildBlastRadiusMermaid(graph, analysis);
  const marker = '<!-- substrate-dependency-blast-radius -->';
  const header = [
    marker,
    '## Dependency Blast Radius',
    '',
    `Base ref: \`${baseRef}\``,
    '',
    `Touched packages: ${listText(analysis.touched)}`,
    '',
    `Impacted packages: ${listText(analysis.impacted)}`,
    '',
    `Package test signal: ${testedSummary(analysis)}`,
    '',
    '```mermaid',
    ''
  ].join('\n');
  const footer = '\n```';
  const truncated = truncateMermaidForComment(mermaid, header, footer);

  return {
    'body': `${header}${truncated.mermaid}${footer}\n`,
    'mermaid': mermaid,
    'truncated': truncated.truncated
  };
}

function writeOptionalArtifact(envKey: string, contents: string): string | null {
  const artifactPath = process.env[envKey];
  if (artifactPath === undefined || artifactPath === '') {
    return null;
  }

  const resolvedArtifactPath = path.resolve(repoRoot, artifactPath);
  mkdirSync(path.dirname(resolvedArtifactPath), { 'recursive': true });
  writeFileSync(resolvedArtifactPath, contents);
  return path.relative(repoRoot, resolvedArtifactPath);
}

function parseBaseRef(): string {
  const baseIndex = process.argv.indexOf('--base');
  const explicitBaseRef = process.argv[baseIndex + 1];
  if (baseIndex !== -1 && explicitBaseRef !== undefined && explicitBaseRef !== '') {
    return explicitBaseRef;
  }

  try {
    return execFileSync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { 'cwd': repoRoot, 'encoding': 'utf8' }).trim().replace(/^refs\/remotes\/origin\//u, 'origin/');
  } catch {
    return 'origin/develop';
  }
}

function changedFiles(baseRef: string, diffFilter: string | null = null): string[] {
  const gitArguments = ['diff', '--name-only'];
  if (diffFilter !== null) {
    gitArguments.push(`--diff-filter=${diffFilter}`);
  }
  gitArguments.push(`${baseRef}...HEAD`);
  const output = execFileSync('git', gitArguments, { 'cwd': repoRoot, 'encoding': 'utf8' });
  return output.split('\n').map((line) => {return line.trim();}).filter((line) => {return line.length > 0;});
}

function packageForPath(filePath: string, packageDirs: string[], packageByDir: Map<string, string>): string | null {
  const resolved = path.resolve(repoRoot, filePath);
  for (const dir of packageDirs) {
    if (resolved.startsWith(`${dir}${path.sep}`)) {
      return packageByDir.get(dir) ?? null;
    }
  }
  return null;
}

function packageTestCounts(packageDirs: string[], packageByDir: Map<string, string>): Map<string, number> {
  const counts = new Map<string, number>();
  const testPattern = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
  const visit = (dir: string): number => {
    let total = 0;
    for (const entry of readdirSync(dir, { 'withFileTypes': true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.orchestration') {
        continue;
      }
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += visit(entryPath);
      } else if (testPattern.test(entry.name)) {
        total += 1;
      }
    }
    return total;
  };

  for (const dir of packageDirs) {
    const packageName = packageByDir.get(dir);
    if (packageName !== undefined) {
      counts.set(packageName, visit(dir));
    }
  }
  return counts;
}

function buildReverseEdges(edges: string[]): Map<string, string[]> {
  const reverseEdges = new Map<string, string[]>();
  for (const edge of edges) {
    const [from, to] = edge.split(' -> ');
    if (from === undefined || to === undefined) {
      continue;
    }
    const list = reverseEdges.get(to) ?? [];
    list.push(from);
    reverseEdges.set(to, list);
  }
  return reverseEdges;
}

function markTouchedStatuses(
  baseRef: string,
  packageDirs: string[],
  packageByDir: Map<string, string>,
  statuses: Map<string, Set<string>>,
  touched: Set<string>
): void {
  const addStatus = (status: string, file: string): void => {
    const pkg = packageForPath(file, packageDirs, packageByDir);
    if (pkg === null) {
      return;
    }
    touched.add(pkg);
    const packageStatuses = statuses.get(pkg) ?? new Set<string>();
    packageStatuses.add(status);
    statuses.set(pkg, packageStatuses);
  };

  for (const file of changedFiles(baseRef, 'A')) {
    addStatus('added', file);
  }
  for (const file of changedFiles(baseRef, 'M')) {
    addStatus('modified', file);
  }
  for (const file of changedFiles(baseRef, 'D')) {
    addStatus('deleted', file);
  }
}

interface ImpactedHopsResultInterface {
  readonly 'impacted': Set<string>;
  readonly 'impactedHops': Map<string, number>;
}

function computeImpactedHops(touched: Set<string>, reverseEdges: Map<string, string[]>): ImpactedHopsResultInterface {
  const impacted = new Set(touched);
  const impactedHops = new Map<string, number>();
  const queue: [string, number][] = [...touched].map((pkg) => {return [pkg, 0];});

  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined) {
      continue;
    }
    const [current, hop] = next;
    const parents = reverseEdges.get(current) ?? [];
    for (const parent of parents) {
      if (impacted.has(parent)) {
        continue;
      }
      impacted.add(parent);
      impactedHops.set(parent, hop + 1);
      queue.push([parent, hop + 1]);
    }
  }

  return { 'impacted': impacted, 'impactedHops': impactedHops };
}

function computeBlastRadius(graph: DependencyGraphInterface, baseRef: string): BlastRadiusAnalysisInterface {
  const packageDirs = listPackageDirs();
  const packageByDir = new Map(packageDirs.map((dir) => {return [dir, packageNameFromDir(dir)];}));
  const statuses = new Map<string, Set<string>>();
  const touched = new Set<string>();

  const reverseEdges = buildReverseEdges(graph.edges);
  markTouchedStatuses(baseRef, packageDirs, packageByDir, statuses, touched);
  const { impacted, impactedHops } = computeImpactedHops(touched, reverseEdges);

  const testCounts = packageTestCounts(packageDirs, packageByDir);
  const missingTests = new Set(
    [...impacted].filter((pkg) => {return !touched.has(pkg) && (testCounts.get(pkg) ?? 0) === 0;})
  );

  return {
    'impacted': [...impacted].toSorted(),
    'impactedHops': impactedHops,
    'missingTests': missingTests,
    'statuses': statuses,
    'testCounts': testCounts,
    'touched': [...touched].toSorted()
  };
}

const graph = buildGraph();
const markdown = buildMarkdown(graph.packages, graph.edges);

if (checkMode) {
  const current = existsSync(docsPath) ? readFileSync(docsPath, 'utf8') : '';
  if (current !== markdown) {
    process.stderr.write('dependency-diagram: docs/dependency-graph.md is out of date.\n');
    process.stderr.write('Run `pnpm run diagram:deps` and commit the regenerated file.\n');
    process.exit(1);
  }
}

if (!checkMode && !blastRadiusMode) {
  writeFileSync(docsPath, markdown);
}

if (blastRadiusMode) {
  const baseRef = parseBaseRef();
  const analysis = computeBlastRadius(graph, baseRef);
  process.stdout.write(`Base ref: ${baseRef}\n`);
  process.stdout.write(`Touched packages: ${analysis.touched.length > 0 ? analysis.touched.join(', ') : 'none'}\n`);
  process.stdout.write(`Blast radius: ${analysis.impacted.length > 0 ? analysis.impacted.join(', ') : 'none'}\n`);
  process.stdout.write(`Package test signal: ${testedSummary(analysis)}\n`);
  const comment = buildBlastRadiusComment(graph, baseRef, analysis);

  const artifactPath = process.env.DEPENDENCY_DIAGRAM_ARTIFACT;
  if (artifactPath !== undefined && artifactPath !== '') {
    const resolvedArtifactPath = path.resolve(repoRoot, artifactPath);
    mkdirSync(path.dirname(resolvedArtifactPath), { 'recursive': true });
    writeFileSync(resolvedArtifactPath, buildBlastRadiusMarkdown(graph, baseRef, analysis));
    process.stdout.write(`Blast-radius diagram: ${path.relative(repoRoot, resolvedArtifactPath)}\n`);
  }

  const mermaidArtifact = writeOptionalArtifact('DEPENDENCY_DIAGRAM_MERMAID_ARTIFACT', `${comment.mermaid}\n`);
  if (mermaidArtifact !== null) {
    process.stdout.write(`Blast-radius Mermaid: ${mermaidArtifact}\n`);
  }

  const commentArtifact = writeOptionalArtifact('DEPENDENCY_DIAGRAM_COMMENT_ARTIFACT', comment.body);
  if (commentArtifact !== null) {
    process.stdout.write(`Blast-radius PR comment: ${commentArtifact}\n`);
  }

  if (comment.truncated) {
    process.stderr.write('dependency-diagram: PR comment Mermaid was truncated to fit GitHub comment limits.\n');
  }
}
