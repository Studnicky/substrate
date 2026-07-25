import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { wholeCanonicalTypes } from '../../src/rules/wholeCanonicalTypes.js';
import scenarioGroups from './wholeCanonicalTypes.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

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

void describe('whole-canonical-types', () => {
  void it('validates whole-canonical-types scenarios', () => {
    ruleTester.run('whole-canonical-types', wholeCanonicalTypes, scenarioGroups);
  });
});
