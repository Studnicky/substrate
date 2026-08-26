import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { deleteProperty } from '../../../src/rules/v8/deleteProperty.js';
import scenarioGroups from './deleteProperty.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

// `delete-property` reports by default without type services (see the rule's own module
// comment for why that default differs from `dynamic-property-access`), so the pre-existing
// scenarios below stay correct either way. `projectService` is still turned on here because
// the EXEMPTION itself — an index-signature or bare-`object` target — is checker-driven and
// cannot be exercised without it.
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts']
      },
      tsconfigRootDir: repoRoot
    }
  }
});

void describe('delete-property', () => {
  void it('validates delete-property scenarios', () => {
    ruleTester.run('delete-property', deleteProperty, scenarioGroups);
  });
});
