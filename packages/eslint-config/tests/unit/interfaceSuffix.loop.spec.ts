import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfaceSuffix } from '../../src/rules/interfaceSuffix.js';
import scenarioGroups from './interfaceSuffix.scenarios.json' with { type: 'json' };

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

void describe('interface-suffix', () => {
  void it('validates interface-suffix scenarios', () => {
    ruleTester.run('interface-suffix', interfaceSuffix, scenarioGroups);
  });
});
