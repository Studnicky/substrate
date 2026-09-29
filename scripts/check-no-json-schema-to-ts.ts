#!/usr/bin/env node
/**
 * check-no-json-schema-to-ts — fails when a package outside the allowed set
 * declares a `json-schema-to-ts` dependency.
 *
 * `json-schema-to-ts` type derivation was removed in favor of `SchemaNode`-
 * built `Node`/`NodeStaticType`. Only `@studnicky/eslint-config` (rule
 * detection plus fixture input) and `@studnicky/entity` (a parity spec) still
 * depend on it. This script is the gate that keeps a fourth package from
 * reintroducing it.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(repoRoot, 'packages');

const ALLOWED_PACKAGE_NAMES: ReadonlySet<string> = new Set([
  '@studnicky/entity',
  '@studnicky/eslint-config'
]);

const DEPENDENCY_FIELDS: readonly string[] = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

interface ViolationInterface {
  readonly 'field': string;
  readonly 'packageJsonPath': string;
  readonly 'packageName': string;
}

const violations: ViolationInterface[] = [];
const packageDirectories = (await readdir(packagesRoot, { 'withFileTypes': true }))
  .filter((entry) => { return entry.isDirectory(); })
  .map((entry) => { return entry.name; })
  .toSorted();

for (const directoryName of packageDirectories) {
  const packageJsonPath = path.join(packagesRoot, directoryName, 'package.json');
  let manifestContents: string;
  try {
    manifestContents = await readFile(packageJsonPath, 'utf8');
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      continue;
    }
    throw error;
  }
  const manifest: unknown = JSON.parse(manifestContents);

  if (typeof manifest !== 'object' || manifest === null) {
    continue;
  }
  const record = manifest as Record<string, unknown>;
  const packageName = typeof record.name === 'string' ? record.name : directoryName;

  if (ALLOWED_PACKAGE_NAMES.has(packageName)) {
    continue;
  }

  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = record[field];

    if (typeof dependencies !== 'object' || dependencies === null) {
      continue;
    }
    if (Object.hasOwn(dependencies, 'json-schema-to-ts')) {
      violations.push({ 'field': field, 'packageJsonPath': path.relative(repoRoot, packageJsonPath), 'packageName': packageName });
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`check-no-json-schema-to-ts: ${String(violations.length)} violation(s).\n\n`);
  for (const violation of violations) {
    process.stderr.write(`  ${violation.packageJsonPath} declares json-schema-to-ts in ${violation.field} (package ${violation.packageName} is not on the allowed list).\n`);
  }
  process.exit(1);
}

process.stdout.write(`check-no-json-schema-to-ts: OK (${String(packageDirectories.length)} package(s) checked).\n`);
