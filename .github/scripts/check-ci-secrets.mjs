#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let root = process.cwd();
for (let i = 0; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--root' && process.argv[i + 1]) {
    root = process.argv[i + 1];
  }
}

const manifestPath = join(root, '.github', 'ci-secrets.json');
const workflowsDir = join(root, '.github', 'workflows');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const ENTRY_KEYS = ['name', 'description', 'scope', 'requiredBy'];
const NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const REQUIRED_BY_KEYS = ['workflow', 'job'];
const errors = [];

const isPlainObject = (value) => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

if (!Array.isArray(manifest)) {
  errors.push('ci-secrets.json must be a JSON array of secret entries.');
}

if (Array.isArray(manifest)) {
  for (const [index, entry] of manifest.entries()) {
    const prefix = `entry[${index}]`;
    if (!isPlainObject(entry)) {
      errors.push(`${prefix}: must be an object`);
      continue;
    }

    for (const key of Object.keys(entry)) {
      if (!ENTRY_KEYS.includes(key)) {
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

    for (const [requiredIndex, requiredBy] of entry.requiredBy.entries()) {
      const requiredPrefix = `${prefix}.requiredBy[${requiredIndex}]`;
      if (!isPlainObject(requiredBy)) {
        errors.push(`${requiredPrefix}: must be an object`);
        continue;
      }
      for (const key of Object.keys(requiredBy)) {
        if (!REQUIRED_BY_KEYS.includes(key)) {
          errors.push(`${requiredPrefix}: unknown key "${key}"`);
        }
      }
      if (typeof requiredBy.workflow !== 'string' || typeof requiredBy.job !== 'string') {
        errors.push(`${requiredPrefix}: "workflow" and "job" must be strings`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('ci-secrets.json does not match the expected manifest shape:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

const workflowFiles = readdirSync(workflowsDir).filter((file) => {
  return file.endsWith('.yml') || file.endsWith('.yaml');
});

const usage = new Map();

for (const file of workflowFiles) {
  const lines = readFileSync(join(workflowsDir, file), 'utf8').split('\n');
  let currentJob = null;
  let inJobs = false;

  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (inJobs && /^\S/.test(line)) {
      inJobs = false;
      currentJob = null;
    }
    if (inJobs) {
      const jobMatch = line.match(/^ {2}([a-zA-Z0-9_-]+):\s*$/);
      if (jobMatch) {
        currentJob = jobMatch[1];
      }
    }

    for (const match of line.matchAll(/secrets\.([A-Z][A-Z0-9_]*)/g)) {
      const secretName = match[1];
      if (secretName === 'GITHUB_TOKEN') {
        continue;
      }
      const key = `${file}\t${currentJob ?? '(unknown job)'}`;
      const names = usage.get(key) ?? new Set();
      names.add(secretName);
      usage.set(key, names);
    }
  }
}

const declaredNames = new Set(manifest.map((entry) => {
  return entry.name;
}));
const actualTriples = new Set();
const expectedTriples = new Set();
const referencedNames = new Set();

for (const [key, names] of usage.entries()) {
  for (const name of names) {
    referencedNames.add(name);
    actualTriples.add(`${key}\t${name}`);
  }
}

for (const entry of manifest) {
  for (const requiredBy of entry.requiredBy) {
    expectedTriples.add(`${requiredBy.workflow}\t${requiredBy.job}\t${entry.name}`);
  }
}

const drift = [];

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
  for (const item of drift) {
    console.error(`  - ${item}`);
  }
  process.exit(1);
}

const unused = manifest.filter((entry) => {
  return entry.requiredBy.length === 0 && !referencedNames.has(entry.name);
});

for (const entry of unused) {
  console.warn(`ci-secrets: ${entry.name} is declared but not referenced by a workflow`);
}

console.log('ci-secrets.json is in sync with .github/workflows/.');
