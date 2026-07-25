#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const checkMode = process.argv.includes('--check');

const ciSecretsSchemaPath = join(repoRoot, '.github', 'ci-secrets.schema.json');

const ciSecretsSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'description', 'scope', 'requiredBy'],
    properties: {
      name: {
        type: 'string',
        pattern: '^[A-Z][A-Z0-9_]*$',
      },
      description: {
        type: 'string',
        minLength: 1,
      },
      scope: {
        type: 'string',
        enum: ['repository', 'environment'],
      },
      requiredBy: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['workflow', 'job'],
          properties: {
            workflow: {
              type: 'string',
              pattern: '^.+\\.ya?ml$',
            },
            job: {
              type: 'string',
              minLength: 1,
            },
          },
        },
      },
    },
  },
};

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const expected = stableJson(ciSecretsSchema);

if (checkMode) {
  const current = existsSync(ciSecretsSchemaPath) ? readFileSync(ciSecretsSchemaPath, 'utf8') : '';
  if (current !== expected) {
    console.error('.github/ci-secrets.schema.json is out of date.');
    console.error('Run `pnpm run config-schema` and commit the regenerated schema.');
    process.exit(1);
  }
  console.log('config-schema: schemas are in sync.');
} else {
  writeFileSync(ciSecretsSchemaPath, expected);
  console.log('config-schema: wrote .github/ci-secrets.schema.json.');
}
