import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { folderContentShape } from '../../src/rules/folderContentShape.js';
import scenarioGroups from './folderContentShape.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

void describe('folder content shape', () => {
  void it('validates folder content shape', () => {
    ruleTester.run('folder-content-shape', folderContentShape, scenarioGroups);
  });
});
