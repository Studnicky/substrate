import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { entityFileShape } from '../../src/rules/entityFileShape.js';
import scenarioGroups from './entityFileShape.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'ecmaVersion': 2022,
      'sourceType': 'module'
    }
  }
});

void describe('entity file shape', () => {
  void it('validates entity file shape', () => {
    ruleTester.run('entity-file-shape', entityFileShape, scenarioGroups);
  });
});
