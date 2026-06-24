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

const SKIP_DIRS = new Set(['.vitepress', 'public', '_examples', 'plans', 'proposals', 'design']);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = path.join(repoRoot, 'docs');

const collectMarkdown = async (dir) => {
  const entries = await readdir(dir, { 'withFileTypes': true });
  const files = [];
  for (const entry of entries) {
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

const countNonGroupTsBlocks = (content) => {
  const lines = content.split('\n');
  const offenders = [];
  let inGroup = false;
  let inFence = false;
  let pendingExemption = false;
  let lineNo = 0;
  for (const line of lines) {
    lineNo += 1;
    const trimmed = line.trim();
    if (trimmed.startsWith('::: code-group')) {
      inGroup = true;
      continue;
    }
    if (trimmed === ':::' && inGroup) {
      inGroup = false;
      continue;
    }
    if (/^<!--\s*inline-ts-ok:/u.test(trimmed)) {
      pendingExemption = true;
      continue;
    }
    const fenceMatch = /^```(ts|typescript)\b/u.exec(trimmed);
    if (fenceMatch !== null && !inFence) {
      inFence = true;
      if (!inGroup && !pendingExemption) {
        offenders.push({ 'line': lineNo, 'lang': fenceMatch[1] });
      }
      pendingExemption = false;
      continue;
    }
    if (trimmed === '```' && inFence) {
      inFence = false;
      continue;
    }
    if (trimmed !== '' && !inFence) {
      pendingExemption = false;
    }
  }
  return offenders;
};

const files = await collectMarkdown(docsRoot);
let total = 0;
const report = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  const offenders = countNonGroupTsBlocks(content);
  if (offenders.length > 0) {
    total += offenders.length;
    report.push({ 'file': path.relative(repoRoot, file), offenders });
  }
}

if (total > INLINE_TS_CEILING) {
  process.stderr.write(`check-docs-includes: ${String(total)} inline TypeScript block(s) exceed ceiling ${String(INLINE_TS_CEILING)}.\n`);
  process.stderr.write('Replace hand-written code with `<<< ../path/to/example.ts#region`, or exempt a conceptual snippet with `<!-- inline-ts-ok: reason -->`.\n\n');
  for (const entry of report) {
    for (const offender of entry.offenders) {
      process.stderr.write(`  ${entry.file}:${String(offender.line)} (\`\`\`${offender.lang})\n`);
    }
  }
  process.exit(1);
}

process.stdout.write(`check-docs-includes: OK (${String(total)} inline block(s), ceiling ${String(INLINE_TS_CEILING)}).\n`);
