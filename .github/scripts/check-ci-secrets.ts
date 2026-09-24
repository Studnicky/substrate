#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let root = process.cwd();
for (let i = 0; i < process.argv.length; i += 1) {
  const next = process.argv[i + 1];
  if (process.argv[i] === '--root' && next !== undefined) {
    root = next;
  }
}

const manifestPath = join(root, '.github', 'ci-secrets.json');
const workflowsDir = join(root, '.github', 'workflows');
const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));

interface RequiredByEntryInterface {
  readonly 'job': string;
  readonly 'workflow': string;
}

interface SecretManifestEntryInterface {
  readonly 'description': string;
  readonly 'name': string;
  readonly 'requiredBy': readonly RequiredByEntryInterface[];
  readonly 'scope': string;
}

const ENTRY_KEYS = new Set(['description', 'name', 'requiredBy', 'scope']);
const NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const REQUIRED_BY_KEYS = new Set(['job', 'workflow']);
const errors: string[] = [];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  const result = typeof value === 'object' && value !== null && !Array.isArray(value);
  return result;
};

const validateRequiredByKeys = (requiredBy: Record<string, unknown>, requiredPrefix: string): string[] => {
  const keyErrors: string[] = [];
  const requiredByKeys = Object.keys(requiredBy);
  for (let rbKeyIndex = 0; rbKeyIndex < requiredByKeys.length; rbKeyIndex += 1) {
    const key = requiredByKeys[rbKeyIndex];
    if (key !== undefined && !REQUIRED_BY_KEYS.has(key)) {
      keyErrors.push(`${requiredPrefix}: unknown key "${key}"`);
    }
  }
  return keyErrors;
};

const validateRequiredByEntries = (requiredByEntries: unknown[], prefix: string): string[] => {
  const entryErrors: string[] = [];
  for (let requiredIndex = 0; requiredIndex < requiredByEntries.length; requiredIndex += 1) {
    const requiredBy = requiredByEntries[requiredIndex];
    const requiredPrefix = `${prefix}.requiredBy[${requiredIndex}]`;
    if (!isPlainObject(requiredBy)) {
      entryErrors.push(`${requiredPrefix}: must be an object`);
      continue;
    }
    entryErrors.push(...validateRequiredByKeys(requiredBy, requiredPrefix));
    if (typeof requiredBy.workflow !== 'string' || typeof requiredBy.job !== 'string') {
      entryErrors.push(`${requiredPrefix}: "workflow" and "job" must be strings`);
    }
  }
  return entryErrors;
};

if (!Array.isArray(manifest)) {
  errors.push('ci-secrets.json must be a JSON array of secret entries.');
}

if (Array.isArray(manifest)) {
  const manifestEntries = manifest as unknown[];
  for (let index = 0; index < manifestEntries.length; index += 1) {
    const entry = manifestEntries[index];
    const prefix = `entry[${index}]`;
    if (!isPlainObject(entry)) {
      errors.push(`${prefix}: must be an object`);
      continue;
    }

    const entryKeys = Object.keys(entry);
    for (let keyIndex = 0; keyIndex < entryKeys.length; keyIndex += 1) {
      const key = entryKeys[keyIndex];
      if (key !== undefined && !ENTRY_KEYS.has(key)) {
        errors.push(`${prefix}: unknown key "${key}"`);
      }
    }

    if (typeof entry.name !== 'string' || !NAME_PATTERN.test(entry.name)) {
      errors.push(`${prefix}: "name" must match ${NAME_PATTERN}`);
    }
    if (typeof entry.description !== 'string' || entry.description.length === 0) {
      errors.push(`${prefix}: "description" must be a non-empty string`);
    }
    if (entry.scope !== 'repository' && entry.scope !== 'environment') {
      errors.push(`${prefix}: "scope" must be "repository" or "environment"`);
    }
    if (!Array.isArray(entry.requiredBy)) {
      errors.push(`${prefix}: "requiredBy" must be an array`);
      continue;
    }

    const requiredByEntries = entry.requiredBy as unknown[];
    errors.push(...validateRequiredByEntries(requiredByEntries, prefix));
  }
}

if (errors.length > 0) {
  console.error('ci-secrets.json does not match the expected manifest shape:');
  for (let index = 0; index < errors.length; index += 1) {
    console.error(`  - ${errors[index]}`);
  }
  process.exit(1);
}

const secretManifest = manifest as SecretManifestEntryInterface[];

const workflowFiles = readdirSync(workflowsDir).filter((file) => {
  const isWorkflowFile = file.endsWith('.yml') || file.endsWith('.yaml');
  return isWorkflowFile;
});

const usage = new Map<string, Set<string>>();

const JOBS_HEADER_PATTERN = /^jobs:\s*$/;
const NON_INDENTED_PATTERN = /^\S/;
const JOB_NAME_PATTERN = /^ {2}([a-zA-Z0-9_-]+):\s*$/;
const SECRET_REFERENCE_PATTERN = /secrets\.([A-Z][A-Z0-9_]*)/g;

for (let fileIndex = 0; fileIndex < workflowFiles.length; fileIndex += 1) {
  const file = workflowFiles[fileIndex];
  if (file === undefined) {
    continue;
  }
  const lines = readFileSync(join(workflowsDir, file), 'utf8').split('\n');
  let currentJob: string | null = null;
  let inJobs = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (line === undefined) {
      continue;
    }
    if (JOBS_HEADER_PATTERN.test(line)) {
      inJobs = true;
      continue;
    }
    if (inJobs && NON_INDENTED_PATTERN.test(line)) {
      inJobs = false;
      currentJob = null;
    }
    if (inJobs) {
      const jobMatch = JOB_NAME_PATTERN.exec(line);
      if (jobMatch !== null) {
        currentJob = jobMatch[1] ?? null;
      }
    }

    for (const match of line.matchAll(SECRET_REFERENCE_PATTERN)) {
      const secretName = match[1];
      if (secretName === undefined || secretName === 'GITHUB_TOKEN') {
        continue;
      }
      const key = `${file}\t${currentJob ?? '(unknown job)'}`;
      const names = usage.get(key) ?? new Set<string>();
      names.add(secretName);
      usage.set(key, names);
    }
  }
}

const declaredNames = new Set(secretManifest.map((entry) => {
  return entry.name;
}));
const actualTriples = new Set<string>();
const expectedTriples = new Set<string>();
const referencedNames = new Set<string>();

for (const [key, names] of usage.entries()) {
  for (const name of names) {
    referencedNames.add(name);
    actualTriples.add(`${key}\t${name}`);
  }
}

for (let index = 0; index < secretManifest.length; index += 1) {
  const entry = secretManifest[index];
  if (entry === undefined) {
    continue;
  }
  for (let requiredIndex = 0; requiredIndex < entry.requiredBy.length; requiredIndex += 1) {
    const requiredBy = entry.requiredBy[requiredIndex];
    if (requiredBy === undefined) {
      continue;
    }
    expectedTriples.add(`${requiredBy.workflow}\t${requiredBy.job}\t${entry.name}`);
  }
}

const drift: string[] = [];

for (const [key, names] of usage.entries()) {
  const [workflow, job] = key.split('\t');
  for (const name of names) {
    if (!declaredNames.has(name)) {
      drift.push(`${workflow} job "${job}" references secrets.${name}, which has no ci-secrets.json entry`);
    }
  }
}

for (const triple of expectedTriples) {
  if (!actualTriples.has(triple)) {
    const [workflow, job, name] = triple.split('\t');
    drift.push(`ci-secrets.json says ${name} is required by ${workflow} job "${job}", but that job does not reference secrets.${name}`);
  }
}

for (const triple of actualTriples) {
  if (!expectedTriples.has(triple)) {
    const [workflow, job, name] = triple.split('\t');
    drift.push(`${workflow} job "${job}" references secrets.${name}, but ci-secrets.json does not list that usage`);
  }
}

if (drift.length > 0) {
  console.error('CI secrets manifest is out of sync with .github/workflows/:');
  for (let index = 0; index < drift.length; index += 1) {
    console.error(`  - ${drift[index]}`);
  }
  process.exit(1);
}

const unused = secretManifest.filter((entry) => {
  const isUnused = entry.requiredBy.length === 0 && !referencedNames.has(entry.name);
  return isUnused;
});

for (let index = 0; index < unused.length; index += 1) {
  console.warn(`ci-secrets: ${unused[index]?.name} is declared but not referenced by a workflow`);
}

console.log('ci-secrets.json is in sync with .github/workflows/.');
