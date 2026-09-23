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

interface PluginInfoInterface {
  readonly 'docsPrefix': string;
  readonly 'file': string;
  readonly 'name': string;
}

const plugins: readonly PluginInfoInterface[] = [
  { 'docsPrefix': '', 'file': path.join(repoRoot, 'packages', 'eslint-config', 'src', 'plugin.ts'), 'name': 'plugin' },
  { 'docsPrefix': 'v8', 'file': path.join(repoRoot, 'packages', 'eslint-config', 'src', 'v8Plugin.ts'), 'name': 'v8Plugin' }
];

interface ViolationInterface {
  readonly 'file': string;
  readonly 'line': number;
  readonly 'message': string;
}

interface RuleRegistrationInterface {
  readonly 'file': string;
  readonly 'line': number;
  readonly 'page': string;
}

interface DocPageInterface {
  readonly 'content': string;
  readonly 'file': string;
  readonly 'name': string;
}

const MARKDOWN_SUFFIX_RE = /\.md$/u;
const HEADING_RE = /^##\s/u;
const FRONTMATTER_FIELD_RE = /^([A-Za-z][\w-]*):\s*\S.*$/u;

const collectMarkdown = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { 'withFileTypes': true });
  const files: string[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry === undefined) {
      continue;
    }
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdown(file));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(file);
    }
  }
  return files;
};

const lineAt = (sourceFile: ts.SourceFile, position: number): number => {
  const line = sourceFile.getLineAndCharacterOfPosition(position).line + 1;
  return line;
};

const propertyName = (property: ts.ObjectLiteralElementLike): string | undefined => {
  if (!('name' in property) || property.name === undefined || !ts.isStringLiteralLike(property.name)) {
    return undefined;
  }
  return property.name.text;
};

function findPluginDeclaration(sourceFile: ts.SourceFile, pluginName: string): ts.VariableDeclaration | undefined {
  const { statements } = sourceFile;
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    if (statement === undefined || !ts.isVariableStatement(statement)) {
      continue;
    }
    const { declarations } = statement.declarationList;
    for (let declarationIndex = 0; declarationIndex < declarations.length; declarationIndex += 1) {
      const candidate = declarations[declarationIndex];
      if (candidate !== undefined && ts.isIdentifier(candidate.name) && candidate.name.text === pluginName) {
        return candidate;
      }
    }
  }
  return undefined;
}

const registeredRules = async (pluginInfo: PluginInfoInterface, violations: ViolationInterface[]): Promise<RuleRegistrationInterface[]> => {
  const content = await readFile(pluginInfo.file, 'utf8');
  const sourceFile = ts.createSourceFile(pluginInfo.file, content, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const pluginFile = path.relative(repoRoot, pluginInfo.file).split(path.sep).join('/');
  const declaration = findPluginDeclaration(sourceFile, pluginInfo.name);
  const initializer = declaration?.initializer;

  if (initializer === undefined || !ts.isObjectLiteralExpression(initializer)) {
    violations.push({
      'file': pluginFile,
      'line': 1,
      'message': `cannot find the ${pluginInfo.name} rule registry.`
    });
    return [];
  }

  const rulesProperty = initializer.properties.find((property) => {
    const matches = propertyName(property) === 'rules';
    return matches;
  });
  if (rulesProperty === undefined || !ts.isPropertyAssignment(rulesProperty) || !ts.isObjectLiteralExpression(rulesProperty.initializer)) {
    violations.push({
      'file': pluginFile,
      'line': lineAt(sourceFile, initializer.getStart(sourceFile)),
      'message': `cannot find the ${pluginInfo.name} rules object.`
    });
    return [];
  }

  const rules: RuleRegistrationInterface[] = [];
  const properties = rulesProperty.initializer.properties;
  for (let index = 0; index < properties.length; index += 1) {
    const property = properties[index];
    if (property === undefined) {
      continue;
    }
    const name = propertyName(property);
    if (name === undefined) {
      violations.push({
        'file': pluginFile,
        'line': lineAt(sourceFile, property.getStart(sourceFile)),
        'message': 'rule registrations must use string-literal names.'
      });
      continue;
    }
    rules.push({
      'file': pluginFile,
      'line': lineAt(sourceFile, property.getStart(sourceFile)),
      'page': pluginInfo.docsPrefix === '' ? name : `${pluginInfo.docsPrefix}/${name}`
    });
  }
  return rules;
};

interface SectionFenceResultInterface {
  readonly 'hasFence': boolean;
  readonly 'line': number;
  readonly 'present': boolean;
}

const sectionHasFence = (lines: readonly string[], heading: string): SectionFenceResultInterface => {
  const headingIndex = lines.findIndex((line) => {
    const isHeading = line.trim() === heading;
    return isHeading;
  });
  if (headingIndex === -1) {
    return { 'hasFence': false, 'line': 1, 'present': false };
  }
  const nextHeading = lines.findIndex((line, index) => {
    const isNextHeading = index > headingIndex && HEADING_RE.test(line);
    return isNextHeading;
  });
  const end = nextHeading === -1 ? lines.length : nextHeading;
  const hasFence = lines.slice(headingIndex + 1, end).some((line) => {
    const isFence = line.trim().startsWith('```');
    return isFence;
  });

  return { 'hasFence': hasFence, 'line': headingIndex + 1, 'present': true };
};

const REQUIRED_FRONTMATTER_FIELDS = ['title', 'description'];

const checkPage = (page: DocPageInterface, violations: ViolationInterface[]): void => {
  const lines = page.content.split('\n');
  const file = path.relative(repoRoot, page.file).split(path.sep).join('/');
  const frontmatterEnd = lines.findIndex((line, index) => {
    const isDelimiter = index > 0 && line.trim() === '---';
    return isDelimiter;
  });

  if (lines[0]?.trim() !== '---' || frontmatterEnd === -1) {
    violations.push({ 'file': file, 'line': 1, 'message': 'missing frontmatter.' });
  } else {
    const frontmatter = lines.slice(1, frontmatterEnd);
    const foundFields = new Set<string>();
    for (let index = 0; index < frontmatter.length; index += 1) {
      const line = frontmatter[index];
      if (line === undefined) {
        continue;
      }
      const match = FRONTMATTER_FIELD_RE.exec(line);
      if (match?.[1] !== undefined) {
        foundFields.add(match[1]);
      }
    }
    for (let index = 0; index < REQUIRED_FRONTMATTER_FIELDS.length; index += 1) {
      const field = REQUIRED_FRONTMATTER_FIELDS[index];
      if (field === undefined || foundFields.has(field)) {
        continue;
      }
      violations.push({
        'file': file,
        'line': frontmatterEnd + 1,
        'message': `frontmatter is missing ${field}.`
      });
    }
  }

  const requiredSections = ['## ✗ Incorrect', '## ✓ Correct'];
  for (let index = 0; index < requiredSections.length; index += 1) {
    const heading = requiredSections[index];
    if (heading === undefined) {
      continue;
    }
    const section = sectionHasFence(lines, heading);
    if (!section.present) {
      violations.push({ 'file': file, 'line': section.line, 'message': `missing ${heading} section.` });
    } else if (!section.hasFence) {
      violations.push({ 'file': file, 'line': section.line, 'message': `${heading} must contain a fenced code block.` });
    }
  }
};

const violations: ViolationInterface[] = [];
const registrationLists = await Promise.all(plugins.map((pluginInfo) => {
  const result = registeredRules(pluginInfo, violations);
  return result;
}));
const registrations = registrationLists.flat();
const markdownFiles = await collectMarkdown(rulesRoot);
const pages: DocPageInterface[] = await Promise.all(markdownFiles.map(async (file) => {
  const page = {
    'content': await readFile(file, 'utf8'),
    'file': file,
    'name': path.relative(rulesRoot, file).split(path.sep).join('/').replace(MARKDOWN_SUFFIX_RE, '')
  };
  return page;
}));
const registeredPageNames = new Set(registrations.map((registration) => {return registration.page;}));
const pagesByName = new Map(pages.map((page) => {return [page.name, page];}));

for (let index = 0; index < registrations.length; index += 1) {
  const registration = registrations[index];
  if (registration === undefined) {
    continue;
  }
  if (!pagesByName.has(registration.page)) {
    violations.push({
      'file': registration.file,
      'line': registration.line,
      'message': `registered rule ${registration.page} has no documentation page.`
    });
  }
}

for (let index = 0; index < pages.length; index += 1) {
  const page = pages[index];
  if (page === undefined) {
    continue;
  }
  if (!registeredPageNames.has(page.name)) {
    violations.push({
      'file': path.relative(repoRoot, page.file).split(path.sep).join('/'),
      'line': 1,
      'message': 'documentation page has no registered rule.'
    });
  }
  checkPage(page, violations);
}

const sortedViolations = violations.toSorted((left, right) => {
  const fileComparison = left.file.localeCompare(right.file);
  if (fileComparison !== 0) {
    return fileComparison;
  }
  const lineComparison = left.line - right.line;
  if (lineComparison !== 0) {
    return lineComparison;
  }
  const messageComparison = left.message.localeCompare(right.message);
  return messageComparison;
});

if (sortedViolations.length > 0) {
  process.stderr.write(`check-rule-docs: ${String(sortedViolations.length)} violation(s).\n\n`);
  for (let index = 0; index < sortedViolations.length; index += 1) {
    const violation = sortedViolations[index];
    if (violation === undefined) {
      continue;
    }
    process.stderr.write(`  ${violation.file}:${String(violation.line)} ${violation.message}\n`);
  }
  process.exit(1);
}

process.stdout.write(`check-rule-docs: OK (${String(pages.length)} checked).\n`);
