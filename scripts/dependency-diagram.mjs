#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const docsPath = path.join(repoRoot, 'docs', 'dependency-graph.md');
const args = new Set(process.argv.slice(2));
const checkMode = args.has('--check');
const blastRadiusMode = args.has('--blast-radius');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function listPackageDirs() {
  return readdirSync(path.join(repoRoot, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(repoRoot, 'packages', entry.name))
    .filter((dir) => existsSync(path.join(dir, 'package.json')));
}

function packageNameFromDir(dir) {
  return readJson(path.join(dir, 'package.json')).name;
}

function tsconfigFromDir(dir) {
  const candidate = path.join(dir, 'tsconfig.json');
  return existsSync(candidate) ? candidate : null;
}

function madgeGraph(entryPath, tsconfigPath) {
  const output = execFileSync(
    'pnpm',
    ['exec', 'madge', '--json', '--extensions', 'ts,tsx,js,mjs,cjs', '--ts-config', tsconfigPath, entryPath],
    { cwd: repoRoot, encoding: 'utf8' }
  );

  return JSON.parse(output);
}

function resolvePackage(filePath, packageDirs, packageByDir, baseDir) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(baseDir, filePath);
  for (const dir of packageDirs) {
    const prefix = `${dir}${path.sep}`;
    if (resolved.startsWith(prefix)) {
      return packageByDir.get(dir) ?? null;
    }
  }
  return null;
}

function buildGraph() {
  const packageDirs = listPackageDirs();
  const packageByDir = new Map(packageDirs.map((dir) => [dir, packageNameFromDir(dir)]));
  const packageToFiles = new Map();

  for (const dir of packageDirs) {
    const tsconfigPath = tsconfigFromDir(dir);
    const srcIndex = path.join(dir, 'src', 'index.ts');
    const entryPath = existsSync(srcIndex) ? srcIndex : path.join(dir, 'src');
    if (!tsconfigPath || !existsSync(entryPath)) {
      continue;
    }

    const graph = madgeGraph(entryPath, tsconfigPath);
    packageToFiles.set(packageByDir.get(dir), {
      dir,
      graph,
      rootDir: path.dirname(entryPath),
    });
  }

  const edges = new Set();
  for (const [packageName, payload] of packageToFiles.entries()) {
    const files = Object.keys(payload.graph);
    for (const file of files) {
      const fromPackage = resolvePackage(file, packageDirs, packageByDir, payload.rootDir);
      if (fromPackage !== packageName) {
        continue;
      }

      for (const dep of payload.graph[file]) {
        const toPackage = resolvePackage(dep, packageDirs, packageByDir, payload.rootDir);
        if (!toPackage || toPackage === fromPackage) {
          continue;
        }
        edges.add(`${fromPackage} -> ${toPackage}`);
      }
    }
  }

  return {
    edges: [...edges].sort(),
    packages: [...packageByDir.values()].sort(),
  };
}

function sanitizeNodeId(value) {
  return `p_${value.replace(/[^A-Za-z0-9_]/g, '_')}`;
}

const STATUS_PRIORITY = ['added', 'modified', 'deleted'];
const BLAST_FILLS = ['#e28c36', '#e2a363', '#e5b98d', '#eacfb4', '#f2e6d9'];
const BLAST_STROKE = '#ad661f';

function blastFill(hop, maxHop) {
  const ratio = maxHop <= 1 ? 0 : (hop - 1) / (maxHop - 1);
  return BLAST_FILLS[Math.round(ratio * (BLAST_FILLS.length - 1))];
}

function contrastText(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#000000' : '#ffffff';
}

function statusForPackage(packageName, statusMap) {
  const statuses = statusMap.get(packageName) ?? new Set();
  return STATUS_PRIORITY.find((status) => statuses.has(status)) ?? null;
}

function collectNodeIds(lines) {
  const nodeIds = new Set();
  for (const line of lines) {
    for (const part of line.trim().split(/\s+-->\s+|\s+-\.->\s+/)) {
      const match = part.match(/^([A-Za-z0-9_]+)/);
      if (match) {
        nodeIds.add(match[1]);
      }
    }
  }
  return nodeIds;
}

function buildMermaid(packages, edges, highlights = {}) {
  const packageSet = new Set(packages);
  const statuses = highlights.statuses ?? new Map();
  const impactedHops = highlights.impactedHops ?? new Map();
  const missingTests = highlights.missingTests ?? new Set();
  const nodeLines = packages.map((name) => `${sanitizeNodeId(name)}["${name}"]`).sort();
  const mermaidEdges = edges.filter((edge) => {
    const [from, to] = edge.split(' -> ');
    return packageSet.has(from) && packageSet.has(to);
  }).map((edge) => {
    const [from, to] = edge.split(' -> ');
    return `${sanitizeNodeId(from)} --> ${sanitizeNodeId(to)}`;
  }).sort();

  const graphLines = [...nodeLines, ...mermaidEdges];
  const keptNodeIds = collectNodeIds(graphLines);
  const presentStatuses = new Set();
  const presentHops = new Set();
  const classDefinitions = [
    'classDef added fill:#d4edda,stroke:#28a745,color:#155724',
    'classDef modified fill:#fff3cd,stroke:#856404,color:#664d03',
    'classDef deleted fill:#f8d7da,stroke:#dc3545,color:#842029,stroke-dasharray:5 5',
  ];
  const classLines = [];

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

  const maxHopSeen = presentHops.size > 0 ? Math.max(...presentHops) : 1;
  for (const hop of [...presentHops].sort((a, b) => a - b)) {
    const fill = blastFill(hop, maxHopSeen);
    classDefinitions.push(`classDef impacted_${hop} fill:${fill},stroke:${BLAST_STROKE},color:${contrastText(fill)}`);
  }

  const noteLines = [];
  let missingTestNoteCount = 0;
  for (const name of [...missingTests].sort()) {
    const nodeId = sanitizeNodeId(name);
    if (!keptNodeIds.has(nodeId)) {
      continue;
    }
    const noteId = `note_tests_${nodeId}`;
    noteLines.push(`${noteId}["No package tests detected for ${name}"]:::notest`);
    noteLines.push(`${noteId} -.-> ${nodeId}`);
    missingTestNoteCount += 1;
  }
  if (missingTestNoteCount > 0) {
    classDefinitions.push('classDef notest fill:#fdecea,stroke:#c0392b,color:#7a1f1f,stroke-dasharray:3 3');
  }

  const legendLines = [];
  const legendLabels = new Map([
    ['added', 'Package contains added files'],
    ['modified', 'Package contains modified files'],
    ['deleted', 'Package contains deleted files'],
  ]);
  for (const status of STATUS_PRIORITY) {
    if (presentStatuses.has(status)) {
      legendLines.push(`legend_${status}["${legendLabels.get(status)}"]:::${status}`);
    }
  }
  for (const hop of [...presentHops].sort((a, b) => a - b)) {
    legendLines.push(`legend_impacted_${hop}["Impacted ${hop === 1 ? '1 hop' : `${hop} hops`} away"]:::impacted_${hop}`);
  }
  if (missingTestNoteCount > 0) {
    legendLines.push('legend_notest["No package tests detected"]:::notest');
  }

  return [
    'flowchart LR',
    ...classDefinitions,
    ...graphLines,
    ...noteLines,
    ...classLines,
    ...(legendLines.length > 0 ? ['subgraph Legend', ...legendLines.map((line) => `  ${line}`), 'end'] : []),
  ].join('\n');
}

function listText(values) {
  return values.length > 0 ? values.join(', ') : 'none';
}

function buildMarkdown(packages, edges) {
  const mermaid = buildMermaid(packages, edges);

  return [
    '# Workspace Dependency Graph',
    '',
    'Generated from `madge` over each workspace package entrypoint.',
    '',
    '```mermaid',
    mermaid,
    '```',
    '',
  ].join('\n');
}

function buildBlastRadiusMermaid(graph, analysis) {
  const packages = analysis.impacted.length > 0 ? analysis.impacted : ['No package changes detected'];
  const edges = analysis.impacted.length > 0
    ? graph.edges.filter((edge) => {
        const [from, to] = edge.split(' -> ');
        return analysis.impacted.includes(from) && analysis.impacted.includes(to);
      })
    : [];
  return analysis.impacted.length > 0
    ? buildMermaid(packages, edges, {
        impactedHops: analysis.impactedHops,
        missingTests: analysis.missingTests,
        statuses: analysis.statuses,
      })
    : buildMermaid(packages, []);
}

function testedSummary(analysis) {
  const impacted = analysis.impacted.length;
  if (impacted === 0) {
    return 'none';
  }
  const withTests = analysis.impacted.filter((pkg) => (analysis.testCounts.get(pkg) ?? 0) > 0).length;
  return `${withTests}/${impacted} impacted package(s) have package tests`;
}

function buildBlastRadiusMarkdown(graph, baseRef, analysis) {
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
    '',
  ].join('\n');
}

function truncateMermaidForComment(mermaid, header, footer) {
  const maxBodyLength = 60000;
  const body = `${header}${mermaid}${footer}`;
  if (body.length <= maxBodyLength) {
    return { mermaid, truncated: false };
  }

  const budget = maxBodyLength - header.length - footer.length - 90;
  const kept = [];
  let total = 0;
  for (const line of mermaid.split('\n')) {
    if (total + line.length + 1 > budget) {
      break;
    }
    kept.push(line);
    total += line.length + 1;
  }
  kept.push('  note_truncated["diagram truncated to fit GitHub comment size"]');
  return { mermaid: kept.join('\n'), truncated: true };
}

function buildBlastRadiusComment(graph, baseRef, analysis) {
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
    '',
  ].join('\n');
  const footer = '\n```';
  const truncated = truncateMermaidForComment(mermaid, header, footer);

  return {
    body: `${header}${truncated.mermaid}${footer}\n`,
    mermaid,
    truncated: truncated.truncated,
  };
}

function writeOptionalArtifact(envKey, contents) {
  const artifactPath = process.env[envKey];
  if (artifactPath === undefined || artifactPath === '') {
    return null;
  }

  const resolvedArtifactPath = path.resolve(repoRoot, artifactPath);
  mkdirSync(path.dirname(resolvedArtifactPath), { recursive: true });
  writeFileSync(resolvedArtifactPath, contents);
  return path.relative(repoRoot, resolvedArtifactPath);
}

function parseBaseRef() {
  const baseIndex = process.argv.indexOf('--base');
  if (baseIndex !== -1 && process.argv[baseIndex + 1]) {
    return process.argv[baseIndex + 1];
  }

  try {
    return execFileSync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim().replace(/^refs\/remotes\/origin\//, 'origin/');
  } catch {
    return 'origin/develop';
  }
}

function changedFiles(baseRef, diffFilter = null) {
  const args = ['diff', '--name-only'];
  if (diffFilter !== null) {
    args.push(`--diff-filter=${diffFilter}`);
  }
  args.push(`${baseRef}...HEAD`);
  const output = execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function packageForPath(filePath, packageDirs, packageByDir) {
  const resolved = path.resolve(repoRoot, filePath);
  for (const dir of packageDirs) {
    if (resolved.startsWith(`${dir}${path.sep}`)) {
      return packageByDir.get(dir) ?? null;
    }
  }
  return null;
}

function packageTestCounts(packageDirs, packageByDir) {
  const counts = new Map();
  const testPattern = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
  const visit = (dir) => {
    let total = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
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
    counts.set(packageByDir.get(dir), visit(dir));
  }
  return counts;
}

function computeBlastRadius(graph, baseRef) {
  const packageDirs = listPackageDirs();
  const packageByDir = new Map(packageDirs.map((dir) => [dir, packageNameFromDir(dir)]));
  const reverseEdges = new Map();
  const statuses = new Map();
  const touched = new Set();

  const addStatus = (status, file) => {
    const pkg = packageForPath(file, packageDirs, packageByDir);
    if (!pkg) {
      return;
    }
    touched.add(pkg);
    const packageStatuses = statuses.get(pkg) ?? new Set();
    packageStatuses.add(status);
    statuses.set(pkg, packageStatuses);
  };

  for (const edge of graph.edges) {
    const [from, to] = edge.split(' -> ');
    const list = reverseEdges.get(to) ?? [];
    list.push(from);
    reverseEdges.set(to, list);
  }

  for (const file of changedFiles(baseRef, 'A')) {
    addStatus('added', file);
  }
  for (const file of changedFiles(baseRef, 'M')) {
    addStatus('modified', file);
  }
  for (const file of changedFiles(baseRef, 'D')) {
    addStatus('deleted', file);
  }

  const impacted = new Set(touched);
  const impactedHops = new Map();
  const queue = [...touched].map((pkg) => [pkg, 0]);

  while (queue.length > 0) {
    const [current, hop] = queue.shift();
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

  const testCounts = packageTestCounts(packageDirs, packageByDir);
  const missingTests = new Set(
    [...impacted].filter((pkg) => !touched.has(pkg) && (testCounts.get(pkg) ?? 0) === 0)
  );

  return {
    impacted: [...impacted].sort(),
    impactedHops,
    missingTests,
    statuses,
    testCounts,
    touched: [...touched].sort(),
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

  const artifactPath = process.env['DEPENDENCY_DIAGRAM_ARTIFACT'];
  if (artifactPath !== undefined && artifactPath !== '') {
    const resolvedArtifactPath = path.resolve(repoRoot, artifactPath);
    mkdirSync(path.dirname(resolvedArtifactPath), { recursive: true });
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
