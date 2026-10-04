#!/usr/bin/env node
/**
 * check-docs-includes — ratchet that forbids hand-written TypeScript code blocks
 * in the docs site.
 *
 * Published documentation must render the ACTUAL example source via VitePress
 * `<<< path#region` transclusion, never a re-typed duplicate that drifts from
 * the runnable, linted code. This script counts inline ```ts / ```typescript
 * fences in docs/**\/*.md that are NOT inside a `::: code-group` and NOT
 * explicitly exempted with an immediately-preceding `<!-- inline-ts-ok: reason -->`
 * marker. The count must not exceed INLINE_TS_CEILING.
 *
 * Exempt a genuinely-conceptual snippet (one with no runnable example backing it)
 * by placing `<!-- inline-ts-ok: why this is not transcludable -->` on the line
 * before its opening fence.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const INLINE_TS_CEILING = 0;

const SKIP_DIRS = new Set(['.vitepress', '_examples', 'design', 'plans', 'proposals', 'public']);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = path.join(repoRoot, 'docs');

interface OffenderInterface {
  readonly 'lang': string;
  readonly 'line': number;
}

interface DocReportInterface {
  readonly 'file': string;
  readonly 'offenders': readonly OffenderInterface[];
}

const INLINE_TS_OK_PATTERN = /^<!--\s*inline-ts-ok:/u;
const TS_FENCE_PATTERN = /^```(ts|typescript)\b/u;

const collectMarkdown = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { 'withFileTypes': true });
  const files: string[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry === undefined) {
      continue;
    }
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      const nested = await collectMarkdown(path.join(dir, entry.name));
      files.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
};

interface FenceStateInterface {
  'inFence': boolean;
  'inGroup': boolean;
  'pendingExemption': boolean;
}

// Each consumer handles one line-classification and reports whether it claimed the line.
const consumeCodeGroupMarker = (trimmed: string, state: FenceStateInterface): boolean => {
  if (trimmed.startsWith('::: code-group')) {
    state.inGroup = true;
    return true;
  }
  if (trimmed === ':::' && state.inGroup) {
    state.inGroup = false;
    return true;
  }
  return false;
};

const consumeExemptionMarker = (trimmed: string, state: FenceStateInterface): boolean => {
  if (INLINE_TS_OK_PATTERN.test(trimmed)) {
    state.pendingExemption = true;
    return true;
  }
  return false;
};

const consumeFenceBoundary = (
  trimmed: string,
  state: FenceStateInterface,
  lineNo: number,
  offenders: OffenderInterface[]
): boolean => {
  const fenceMatch = TS_FENCE_PATTERN.exec(trimmed);
  const lang = fenceMatch?.[1];
  if (fenceMatch !== null && lang !== undefined && !state.inFence) {
    state.inFence = true;
    if (!state.inGroup && !state.pendingExemption) {
      offenders.push({ 'lang': lang, 'line': lineNo });
    }
    state.pendingExemption = false;
    return true;
  }
  if (trimmed === '```' && state.inFence) {
    state.inFence = false;
    return true;
  }
  return false;
};

const countNonGroupTsBlocks = (content: string): OffenderInterface[] => {
  const lines = content.split('\n');
  const offenders: OffenderInterface[] = [];
  const state: FenceStateInterface = { 'inFence': false, 'inGroup': false, 'pendingExemption': false };
  let lineNo = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) {
      continue;
    }
    lineNo += 1;
    const trimmed = line.trim();
    if (consumeCodeGroupMarker(trimmed, state)) {
      continue;
    }
    if (consumeExemptionMarker(trimmed, state)) {
      continue;
    }
    if (consumeFenceBoundary(trimmed, state, lineNo, offenders)) {
      continue;
    }
    if (trimmed !== '' && !state.inFence) {
      state.pendingExemption = false;
    }
  }
  return offenders;
};

const files = await collectMarkdown(docsRoot);
let total = 0;
const report: DocReportInterface[] = [];
for (let index = 0; index < files.length; index += 1) {
  const file = files[index];
  if (file === undefined) {
    continue;
  }
  const content = await readFile(file, 'utf8');
  const offenders = countNonGroupTsBlocks(content);
  if (offenders.length > 0) {
    total += offenders.length;
    report.push({ 'file': path.relative(repoRoot, file), 'offenders': offenders });
  }
}

if (total > INLINE_TS_CEILING) {
  process.stderr.write(`check-docs-includes: ${String(total)} inline TypeScript block(s) exceed ceiling ${String(INLINE_TS_CEILING)}.\n`);
  process.stderr.write('Replace hand-written code with `<<< ../path/to/example.ts#region`, or exempt a conceptual snippet with `<!-- inline-ts-ok: reason -->`.\n\n');
  for (let entryIndex = 0; entryIndex < report.length; entryIndex += 1) {
    const entry = report[entryIndex];
    if (entry === undefined) {
      continue;
    }
    for (let offenderIndex = 0; offenderIndex < entry.offenders.length; offenderIndex += 1) {
      const offender = entry.offenders[offenderIndex];
      if (offender === undefined) {
        continue;
      }
      process.stderr.write(`  ${entry.file}:${String(offender.line)} (\`\`\`${offender.lang})\n`);
    }
  }
  process.exit(1);
}

process.stdout.write(`check-docs-includes: OK (${String(total)} inline block(s), ceiling ${String(INLINE_TS_CEILING)}).\n`);
