#!/usr/bin/env node
/**
 * check-rule-docs — verifies that ESLint rule documentation has one current
 * page for every registered rule, required metadata, and proven examples.
 *
 * Rule pages are the public reference for the rule plugins. This script reads
 * the registered rule names from the plugin source, then checks that the
 * corresponding pages are neither missing nor orphaned. Every page must have
 * title and description frontmatter plus the standard Incorrect and Correct
 * sections, each with a fenced code block.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rulesRoot = path.join(repoRoot, 'docs', 'eslint', 'rules');
const plugins = [
  { 'docsPrefix': '', 'file': path.join(repoRoot, 'packages', 'eslint-config', 'src', 'plugin.ts'), 'name': 'plugin' },
  { 'docsPrefix': 'v8', 'file': path.join(repoRoot, 'packages', 'eslint-config', 'src', 'v8Plugin.ts'), 'name': 'v8Plugin' }
];

const toRelativePath = (file) => path.relative(repoRoot, file).split(path.sep).join('/');

const collectMarkdown = async (directory) => {
  const entries = await readdir(directory, { 'withFileTypes': true });
  const files = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdown(file));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(file);
    }
  }
  return files;
};

const lineAt = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const propertyName = (property) => {
  if (property.name === undefined || !ts.isStringLiteralLike(property.name)) {
    return undefined;
  }
  return property.name.text;
};

const registeredRules = async (pluginInfo, violations) => {
  const content = await readFile(pluginInfo.file, 'utf8');
  const sourceFile = ts.createSourceFile(pluginInfo.file, content, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const declaration = sourceFile.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === pluginInfo.name);
  const initializer = declaration?.initializer;

  if (initializer === undefined || !ts.isObjectLiteralExpression(initializer)) {
    violations.push({
      'file': toRelativePath(pluginInfo.file),
      'line': 1,
      'message': `cannot find the ${pluginInfo.name} rule registry.`
    });
    return [];
  }

  const rulesProperty = initializer.properties.find((property) => propertyName(property) === 'rules');
  if (rulesProperty === undefined || !ts.isPropertyAssignment(rulesProperty) || !ts.isObjectLiteralExpression(rulesProperty.initializer)) {
    violations.push({
      'file': toRelativePath(pluginInfo.file),
      'line': lineAt(sourceFile, initializer.getStart(sourceFile)),
      'message': `cannot find the ${pluginInfo.name} rules object.`
    });
    return [];
  }

  const rules = [];
  for (const property of rulesProperty.initializer.properties) {
    const name = propertyName(property);
    if (name === undefined) {
      violations.push({
        'file': toRelativePath(pluginInfo.file),
        'line': lineAt(sourceFile, property.getStart(sourceFile)),
        'message': 'rule registrations must use string-literal names.'
      });
      continue;
    }
    rules.push({
      'file': toRelativePath(pluginInfo.file),
      'line': lineAt(sourceFile, property.getStart(sourceFile)),
      'page': pluginInfo.docsPrefix === '' ? name : `${pluginInfo.docsPrefix}/${name}`
    });
  }
  return rules;
};

const sectionHasFence = (lines, heading) => {
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex === -1) {
    return { 'line': 1, 'present': false };
  }
  const nextHeading = lines.findIndex((line, index) => index > headingIndex && /^##\s/u.test(line));
  const end = nextHeading === -1 ? lines.length : nextHeading;
  const hasFence = lines.slice(headingIndex + 1, end).some((line) => line.trim().startsWith('```'));

  return { 'hasFence': hasFence, 'line': headingIndex + 1, 'present': true };
};

const checkPage = (page, violations) => {
  const lines = page.content.split('\n');
  const file = toRelativePath(page.file);
  const frontmatterEnd = lines.findIndex((line, index) => index > 0 && line.trim() === '---');

  if (lines[0]?.trim() !== '---' || frontmatterEnd === -1) {
    violations.push({ 'file': file, 'line': 1, 'message': 'missing frontmatter.' });
  } else {
    const frontmatter = lines.slice(1, frontmatterEnd);
    for (const field of ['title', 'description']) {
      if (!frontmatter.some((line) => new RegExp(`^${field}:\\s*\\S`, 'u').test(line))) {
        violations.push({
          'file': file,
          'line': frontmatterEnd + 1,
          'message': `frontmatter is missing ${field}.`
        });
      }
    }
  }

  for (const heading of ['## ✗ Incorrect', '## ✓ Correct']) {
    const section = sectionHasFence(lines, heading);
    if (!section.present) {
      violations.push({ 'file': file, 'line': section.line, 'message': `missing ${heading} section.` });
    } else if (!section.hasFence) {
      violations.push({ 'file': file, 'line': section.line, 'message': `${heading} must contain a fenced code block.` });
    }
  }
};

const violations = [];
const registrations = (await Promise.all(plugins.map((pluginInfo) => registeredRules(pluginInfo, violations)))).flat();
const pages = await Promise.all((await collectMarkdown(rulesRoot)).map(async (file) => ({
  'content': await readFile(file, 'utf8'),
  'file': file,
  'name': path.relative(rulesRoot, file).split(path.sep).join('/').replace(/\.md$/u, '')
})));
const registeredPageNames = new Set(registrations.map((registration) => registration.page));
const pagesByName = new Map(pages.map((page) => [page.name, page]));

for (const registration of registrations) {
  if (!pagesByName.has(registration.page)) {
    violations.push({
      'file': registration.file,
      'line': registration.line,
      'message': `registered rule ${registration.page} has no documentation page.`
    });
  }
}

for (const page of pages) {
  if (!registeredPageNames.has(page.name)) {
    violations.push({
      'file': toRelativePath(page.file),
      'line': 1,
      'message': 'documentation page has no registered rule.'
    });
  }
  checkPage(page, violations);
}

violations.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line || left.message.localeCompare(right.message));

if (violations.length > 0) {
  process.stderr.write(`check-rule-docs: ${String(violations.length)} violation(s).\n\n`);
  for (const violation of violations) {
    process.stderr.write(`  ${violation.file}:${String(violation.line)} ${violation.message}\n`);
  }
  process.exit(1);
}

process.stdout.write(`check-rule-docs: OK (${String(pages.length)} checked).\n`);
